var express = require('express');
var router = express.Router();
var auth = require('../../../lib/auth');

/**
 * Takes an HTTP Basic Auth String and returns the username and password parts of it.
 *
 * @param authString The auth string with "Basic " already removed from beginning,
 * @returns {Object|Boolean} An object with fields `email` and `password` or the value `false`
 * indicating that the auth string is not valid.
 */
function decodeAuthString(authString) {
    var buffer = new Buffer(authString, 'base64');
    var s = buffer.toString();
    console.log(s);

    //Split into 2 parts at the first instance of the : . We know that the first
    //: will be the separator since emails cannot contain ports
    var parts = s.split(':');
    //If it doesn't have two parts it's an error
    if (parts.length < 2) {
        return false;
    }
    var email = parts[0];
    var password = parts.slice(1).join(':');

    return {
        email: email,
        password: password
    };
}

router.post('/api/authTest', function (req, res) {
    auth.isValidToken(req.db, req.headers.authorization, function (result) {
        if (!result) {
            res.send(401);
        } else {
            res.send(200);
        }
    });
});

router.post('/api/auth', function (req, res) {
    if (!req.headers.authorization) {
        return res.send(400, 'Basic HTTP Auth required');
    }

    var authString = req.headers.authorization;
    var matches = authString.split(' ');

    //Check that it's basic auth in right format
    if (matches.length !== 2 || matches[0] !== 'Basic') {
        return res.send(400, 'Basic HTTP Auth required.');
    }

    var user = decodeAuthString(matches[1]);
    auth.validateLogin(req.db, user.email, user.password, function (result) {
        if (result) {
            var name = req.body.name;
            if (name === '') {
                return res.send(400, 'Name field required');
            }

            var mobileTokens = req.db.get('mobileTokens');
            mobileTokens.insert({
                business: user._id,
                name: name
            }, function (err, result) {
                if (err) {
                    return console.error('Mongo Error: ' + err);
                }

                res.json(200, {
                    api_token: result._id
                });
            });

            //res.json(200, req.body);
        } else {
            res.send(401);
        }
    });
});

module.exports = router;
