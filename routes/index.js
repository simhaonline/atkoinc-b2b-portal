const express = require('express');
const router = express.Router();
const axios = require('axios');
var oidc = require('@okta/oidc-middleware');

module.exports = function (_oidc){
    oidc = _oidc;

  router.get('/', function(req, res, next) {
    res.render('index', { title: 'Partner Management Portal'});
  });

  router.get('/notAuthorized', function(req, res, next) {
    res.render('notauthorized', { title: 'Partner Management Portal'});
  });

  router.get("/logout", (req, res) => {

    if(req.userContext){
      let protocol = "http"
      if(req.secure){
          protocol = "https"
      }
      else if(req.get('x-forwarded-proto')){
          protocol = req.get('x-forwarded-proto').split(",")[0]
      }
      const tokenSet = req.userContext.tokens;
      const id_token_hint = tokenSet.id_token
      req.logout();
      req.session.destroy();
      res.redirect(process.env.ISSUER+'/v1/logout?id_token_hint='
          + id_token_hint
          + '&post_logout_redirect_uri='
          + encodeURI(protocol+"://"+req.headers.host)
          );
    }
    else {
      res.redirect("/")
    }
  });

  return router;
}
