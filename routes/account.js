const express = require('express');
const router = express.Router();
const axios = require('axios');
var oidc = require('@okta/oidc-middleware');
const UserModel = require('../models/usermodel')

module.exports = function (_oidc){
  oidc = _oidc;

router.get('/', oidc.ensureAuthenticated(), function(req, res, next) {
  res.render('account', { title: 'Your Account',user: req.userContext.userinfo.given_name ,usercontext: req.userContext});
});

router.get('/resetpassword/:token', async function(req, res, next) {
    try{
        var resp = await axios.post(process.env.TENANT_URL+'/api/v1/authn/recovery/token',
        {
            recoveryToken: req.params.token,
        })
        res.render("resetPwd",{ title: 'Reset your password',state: resp.data.stateToken})
    } catch(err) {
        console.log(err)
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error', { title: 'Error' });
    }  
})

router.post('/resetpassword/', async function(req, res, next) {

    try{
        await axios.post(process.env.TENANT_URL+'/api/v1/authn/credentials/reset_password',
        {
        stateToken: req.body.state,
        newPassword: req.body.password  
        })
        res.redirect('/dashboard')
    } catch(err) {
        if(err.response.data.errorCode === 'E0000080'){
            res.render("resetPwd",{ title: 'Reset your password',state: req.body.state, error: err.response.data.errorSummary})
        }
        else{
            console.log(err)
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error', { title: 'Error' });
        }
    }  
})

router.get('/activate/:token', async function(req, res, next) {
    var token = req.params.token;
    var username = req.query.username;
    req.url = '/activate'
    try{
    var response = await axios.post(process.env.TENANT_URL+'/api/v1/authn',
        {
            token: token
        },
        {
            headers: {
                "X-Forwarded-For" : req.connection.remoteAddress
            }
        });
        var status = response.data.status
        switch(status){
            case "SUCCESS":
                res.render('activate', { title: 'Activate Your Account', msg: "You're all set"});
            case "PASSWORD_RESET":
                    var profileresp = await axios.get(process.env.TENANT_URL+'/api/v1/users/'+username);
                    var targetUser = new UserModel(profileresp.data)
                    if(targetUser.federated){
                        res.redirect(process.env.TENANT_URL+"?username="+username+"&fromURI="+ process.env.BOOKMARK_EMBED_URL)
                    }
                    else{
                        res.render('activate', { title: 'Activate Your Account', msg: "Whats the magic word?", state: response.data.stateToken, pwdReset: true});
                    }
        }        
    }
    catch (err){
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error', { title: 'Error' });
    }
  });

  router.post('/activate/', async function (req,res,next){
        try {
            var response = await axios.post(process.env.TENANT_URL+'/api/v1/authn/credentials/reset_password',
            {
                stateToken: req.body.state,
                newPassword: req.body.password
            });
            
            if(response.data.status === "SUCCESS" || response.data.status === "MFA_ENROLL"){
                    res.render('activate', { title: 'Activate Your Account', msg: "Your account has been activated. Please login to continue."});
            } else {
                    res.render('activate', { title: 'Activate Your Account', msg: "Failed: status was "+response.data.status});
            }
        }
        catch(err) {
            console.log(err)
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error', { title: 'Error' });
            }  
  });

  return router;
}

