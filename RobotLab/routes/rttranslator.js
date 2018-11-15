var express = require('express');
var router = express.Router();

/* GET real-time translator. */
router.get('/', function(req, res, next) {
    res.render('rttranslator');
    next();
});

module.exports = router;