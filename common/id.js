const ID_LEN = 8;

function makeid(length=ID_LEN) {
    /* https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript */
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

exports.makeid = makeid;