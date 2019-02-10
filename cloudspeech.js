// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const fs = require('fs');

// Creates a client
const projectID = 'GLocalizationProjects';
const client = new speech.SpeechClient({
    projectId: projectID,
    keyFilename: '/home/yuan/auth/GLocalizationProjects-4f795dcb895a.json'
});

// The name of the audio file to transcribe
const fileName = '/home/yuan/resources/sample_16k_mono.flac';

// Reads a local audio file and converts it to base64
const file = fs.readFileSync(fileName);
const audioBytes = file.toString('base64');

// The audio file's encoding, sample rate in hertz, and BCP-47 language code
const audio = {
    content: audioBytes
};
const config = {
    encoding: 'FLAC',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
};
const request = {
    audio: audio,
    config: config

};


//try recognize
client.longRunningRecognize(request, null, (err, response) => {
    if(err){
        console.log('encountered error:' + err.toString());
    }else{
        console.log('got response from api:' + JSON.stringify(response));
        // response.results
        //     .map(result => result.alternatives[0].transcript)
        //     .join('\n');
        // console.log(`Transcription: ${transcription}`);
    }

});

// Detects speech in the audio file. This creates a recognition job that you
// can wait for now, or get its result later.
// const [operation] = client.longRunningRecognize(request);
// // Get a Promise representation of the final result of the job
// const [response] = operation.promise();
// const transcription = response.results
//     .map(result => result.alternatives[0].transcript)
//     .join('\n');
// console.log(`Transcription: ${transcription}`);