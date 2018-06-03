const createError = require('http-errors');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const Busboy = require('busboy');
const fs = require('fs');


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const gdsub_util = require('./utilities');

const app = express();

const projectID = 'GLocalizationProjects';
//google translate
//google cloud translate api
const google_translate = require('@google-cloud/translate');
const target_lang = 'zh';
const translator = new google_translate({
    projectId: projectID,
    keyFilename: '/home/yuan/auth/GLocalizationProjects-4f795dcb895a.json'
});

var tasks = [];

const EventEmitter = require('events');
class customEventEmitter extends EventEmitter{};
const stateEmitter = new customEventEmitter();
stateEmitter.on(1000, (blocks, sentence_block)=>{
    //debugging
    for(var i=0; i<blocks.length; i++){
        console.log('array index:' + i);
        var b = blocks[i];
        gdsub_util.showSubtitleBlock(b);
        // console.log('sentence:' + sentences[b.sentence]);

    }

    for(var i=0; i<sentence_block.length; i++){
        var b = sentence_block[i];
        gdsub_util.showSentenceBlock(b);
    }
});
stateEmitter.on(1003, (token)=>{
    console.log('translate processing completed, start generating subtitle file');
    var data = {};
    data.token = token;
    data.msg = 'translate processing completed, start generating subtitle file';
    app.emit('state', data);

    var task = tasks[token];
    gdsub_util.generateSubtitle(token, task.target_file);
});

stateEmitter.on(1004, (file)=>{
    console.log('generated subtitle file:' + file);
    var data = {};
    data.token = token;
    data.msg = 'generated subtitle file:' + file;
    app.emit('state', data);
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


gdsub_util.registerObserver(stateEmitter);

app.post('/translate', function(req, res){
    // console.log('post request, body:' + JSON.stringify(req.body));
    // console.log('original english:' + req.body.content);
    var src = req.body.content;
    translator.translate(src, target_lang)
        .then(function(results){
            var translation = results[0];
            //console.log('total results:' + results.length);
            console.log('translation:' + translation);

            res.status(200);
            res.send(translation);
            res.end();
        });

});


app.post('/subtitle', function(req, res){
    console.log('token=' + req.param('token'));
    var token = req.param('token');

    var busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        console.log('busboy onfile');
        console.log('fieldname=' + fieldname
            + ' file=' + file
            + ' filename=' + filename
            + ' encoding=' + encoding
            + ' mimetype=' + mimetype);

        var file_name_str = filename.substring(0, filename.lastIndexOf('.'));
        console.log('extracted file name:' + file_name_str);
        var target = __dirname + '/subtitles/' + filename;

        file.pipe(fs.createWriteStream(target));

        var task = {};
        task.token = token;
        task.filename = file_name_str;
        task.source_file = __dirname + '/subtitles/' + filename;
        task.target_file = __dirname + '/subtitles/' + file_name_str + '.zh.srt';
        tasks[token] = task;
    });
    busboy.on('finish', function() {
        console.log('busboy onfinish');
        res.send(200);
        res.end();

        var data = {};
        data.token = token;
        data.msg = 'subtitle uploaded';
        app.emit('state', data);
        var t = tasks[token];
        gdsub_util.traverse(t.source_file, token, (token)=>{
            console.log('subtitle file traverse completed, token:' + token);
            var data = {};
            data.token = token;
            data.msg = 'subtitle file traverse completed';
            app.emit('state', data);
        });
    });

    return req.pipe(busboy);
});

// app.get('/download', function(req, res){
//
// });


app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
