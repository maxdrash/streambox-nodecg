'use strict';
const Serial = require('serialport')
const Readline = require('@serialport/parser-readline')
const {OBSUtility} = require('nodecg-utility-obs')
const request = require('request')

module.exports = function (nodecg) {
  const obs = new OBSUtility(nodecg)
  //const users = new Users.Users(nodecg)
  const serial = Serial('/dev/ttyACM0',{autoOpen:false});
  serial.on('open',()=>{
    serial.write('\n\n\n')
    serial.write("!LO\n")
    serial.write("!B00\n")
    serial.write("!B10\n")
    serial.write("!B20\n")
  })
  const parser = serial.pipe(new Readline())
  let countdown = false
  let end = false

  function processSerial(line){
    nodecg.log.info('Got Serial Line: '+line);
    if(line[0]=="B"){
      processInput(line[1],line[2])
    }else if(line[0]=="C" && line.length<=6){
      processLogin(line.slice(1))
    }else if(line[0]=="L" && line[1]=="O"){
      processLogout()
    }
  }

  function changeState(state){
    if(state=="live"){
      serial.write("\n!SL\n")
    }else if(state=="connected"){
      serial.write("\n!SC\n")
    }else if(state=="disconnected"){
      serial.write("\n!SD\n")
    }
  }

  function changeShield(state){
    serial.write("!B0"+state+"\n")
    nodecg.log.info("Changing sheld to: "+state)
    if(state==1){
      obs.send('SetSceneItemProperties',{"scene-name":"Screen","item":"Banner Logos","visible":true})
    }else{
      obs.send('SetSceneItemProperties',{"scene-name":"Screen","item":"Banner Logos","visible":false})
    }
  }
  function changeCountdown(state){
    if(end){
      serial.write("!B20\n")
      return
    }
    serial.write("!B2"+state+"\n")
    if(state==1){
      transition('Techlahoma - Countdown',true)
      obs.send('SetSceneItemProperties',{"scene-name":"Screen","item":"Techlahoma - Countdown","visible":true})
      countdown = true
    }else{
      obs.send('SetSceneItemProperties',{"scene-name":"Screen","item":"Techlahoma - Countdown","visible":false})
      nodecg.sendMessage('obs:transition','Cut')
      countdown = false
    }
  }
  function changeEnd(state){
    if(countdown){
      serial.write("!B10\n")
      return
    }
    serial.write("!B1"+state+"\n")
    if(state==1){
      transition('Techlahoma - Ended',true)
      end = true
    }else{
      nodecg.sendMessage('obs:transition','Cut')
      end = false
    }
  }
  function transition(scene,force){
    obs.send('SetPreviewScene',{"scene-name":scene}).then(()=>{
      if((end || countdown)&&!force){
        return
      }
      nodecg.sendMessage('obs:transition','Cut')
    })
  }
  function mute(state){
    serial.write("!7"+state+"\n")
    if(state==1){
      obs.send("SetMute",{source:"Mic",mute:true})
    }else{
      obs.send("SetMute",{source:"Mic",mute:false})
    }
  }

  function processLogin(code){
    serial.write("!CC\n")
    request.post({
        url:'https://streambox-auth.projectmakeit.com/streambox/code',
        json:{
          code: code
        }
    })
    .auth(null,null,true,'test')
    .then((body)=>{
      try{
        let data = JSON.parse(body)
        if(data.key){
          obs.send('SetStreamSettings',{type:"rtmp_custom",settings:{server:data.server,key:data.key,use-auth:false,username:"",password:""},save:false})
          serial.write("!SC\n!LI\n")
          nodecg.sendMessage('obs:connect', {ip:'localhost',port:4444,password:''})
        }else{
          serial.write("!LO\n")
        }
      }catch(e){
        serial.write("!LO\n")
      }
    }).catch((err)=>{
      serial.write("!LO\n")
    })
    /*
    if(users.changeUserByCode(code))
      serial.write("!UG\n")
      serial.write(users.currentUser.group.name)
      serial.write("\n!LI\n")
      obs.send('SetStreamSettings',{type:"rtmp_custom",settings:{server:users.currentUser.group.server}})
    }
    serial.write("!UG\n")
    serial.write("Test User\n")
    serial.write("\n!LI\n")
    nodecg.sendMessage('obs:connect', {ip:'localhost',port:4444,password:''})
    */
  }

  function processLogout(){
    //obs.send('SetStreamSettings',{type:"rtmp_custom",settings:{server:users.empty}})
    serial.write("!LO")
    nodecg.log.info("Logging Out")
    //users.closeUser()
    nodecg.sendMessage('obs:disconnect')
  }

  function triggerState(){
    //users.transitionNextState()
    changeState("connecting")
  }

  function processInput(button,value){
    if(button==0){
      changeShield(value)
    }else if(button==1){
      changeEnd(value)
    }else if(button==2){
      changeCountdown(value)
    }else if(button==3){
      transition("speaker") 
    }else if(button==4){
      transition("speaker/slides")
    }else if(button==5){
      transition("slides")
    }else if(button==6){
      transition("slides/speaker")
    }else if(button==7){
      mute(value)
    }else if(button=="A"){
      triggerState()
    }
  }

  parser.on('data',processSerial)
  nodecg.sendMessage('obs:disconnect')
	nodecg.log.info('Ready');
  function attemptSerialOpen(){
    serial.open((err)=>{
      if(err){
        setTimeout(attemptSerialOpen,5000)
      }
    })
  }
  attemptSerialOpen()
  
}

