'use strict';
const Serial = require('serialport')
const {OBSUtility} = require('nodecg-utility-obs')
const serial = Serial('/dev/tty-interface',{autoOpen: false});
const Users = require('streambox-users')

module.exports = function (nodecg) {
  const obs = new OBSUtility(nodecg)
  const users = new Users.Users(nodecg)
  const serial = Serial('/dev/ttyACM0');
  const parser = serial.pipe(new Readline())
  /*const oauth = new google.auth.OAuth2(
    nodecg.bundleConfig.youtube.client_id,
    nodecg.bundleConfig.youtube.client_secret,
    nodecg.bundleConfig.hostname+'/oauth/callback/youtube'
  )*/

  app.get('/oauth/callback/youtube',(req,res) =>{
    let host = Users.HostYoutube(req.query.code)
    let user = new Users.User()
    user.setHost(host)
    users.addUser(user)
    res.send(200)
  })
  app.get('/oauth/callback/twitch',(req,res) =>{
  })

  function processSerial(line){
    if(line[0]=="B"){
      processInput(line[1],line[2])
    }else if(line[0]=="C"){
      processLogin(line.slice(1))
    }else if(line=="LO"){
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
    serial.write("!0%d\n"%state)
  }
  function changeCountdown(state){
    serial.write("!2%d\n"%state)
  }
  function changeEnd(state){
    serial.write("!1%d\n"%state)
  }
  function transition(scene){
    obs.send('SetCurrentScene',{scene-name:scene})
  }
  function mute(state){
    serial.write("!7%d\n"%state)
  }

  function processLogin(code){
    /*
    if(users.changeUserByCode(code))
      serial.write("!UG\n")
      serial.write(users.currentUser.group.name)
      serial.write("\n!LI\n")
      obs.send('SetStreamSettings',{type:"rtmp_custom",settings:{server:users.currentUser.group.server}})
    }
    */
    serial.write("!UG\n")
    serial.write("Test User\n")
    serial.write("\n!LI\n")
  }

  function processLogout(){
    obs.send('SetStreamSettings',{type:"rtmp_custom",settings:{server:users.empty}})
    serial.write("!LO")
    //users.closeUser()
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
      transition("speaker") }else if(button==4){
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
	nodecg.log.info('Ready');
}

