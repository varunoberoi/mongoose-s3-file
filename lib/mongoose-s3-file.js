var async = require('async'),
    debug = require('debug')('mongoose-s3-file'),
    _ = require('lodash'),
    guid = require('./guid'),
    AWS = require('aws-sdk'),
    gm = require('gm'),
    mongoose,
    s3;

/* 
    Helpers
*/
var matchS3File = function(type) {
    return mongoose.SchemaTypes.S3File === type || mongoose.SchemaTypes.S3File === type.type;
};

var matchArrayOfS3File = function(type) {
    if (_.isArray(type)) {
        return matchS3File(type[0]);
    }
    return false;
};

var matchArrayOfObject = function(type) {
    if (_.isArray(type))
        if (_.isObject(type[0]))
            if (!_.has(type[0], 'type'))
                return (typeof type[0] === 'object')
    return false;
};

var matchObject = function(type) {
    if (_.isObject(type) && !_.isArray(type))
        if (!_.has(type, 'type'))
            return (typeof type === 'object')
    return false;
};


var checkIfUrlOrB64 = function(value) {
    if (!value)
        return false;
    if(_.isString(value)){
        if(/^data:image/i.test(value))
            return false;
        if(/^(http:https):/i.test(value))
            return true;
    }
    return true;
};

// Uploads Base64 to S3 & returns absolute url via callback
var uploadB64ToS3 = function(fileOptions, cb) {

    if (!fileOptions.bucketName)
        return cb("No bucket name specified neither in field nor via plugin");

    var buf = new Buffer(fileOptions.file.replace(/^data:image\/\w+;base64,/, ""), 'base64');

    fileOptions.s3ObjectACL = fileOptions.s3ObjectACL || 'public-read';
    fileOptions.prefix = fileOptions.prefix || '';

    var tmp = {}

    if (fileOptions.expireAfter)
        tmp['Expires'] = Date.now() + fileOptions.expireAfter;

    if (fileOptions.expiry)
        tmp['Expires'] = fileOptions.expiry;

    if (fileOptions.styles) {
        var arguments = _.pairs(fileOptions.styles);

        async.map(arguments, function(argument, callback) {

            convertImageBuffer(buf, argument[1], function(err, buf) {
                if (err) 
                    return callback(err);

                tmp = _.extend(tmp, {
                    ACL: fileOptions.s3ObjectACL,
                    Bucket: fileOptions.bucketName,
                    Key: fileOptions.prefix + '/' + argument[0] + '_' + fileOptions.name,
                    Body: buf // Modified buffer
                });

                s3.putObject(tmp, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, [argument[0], "https://s3-" + fileOptions.region + ".amazonaws.com/" + fileOptions.bucketName + '/' + fileOptions.prefix + '/' + argument[0] + '_' + fileOptions.name]);
                    }
                });
            });
        }, function(err, result) {
            if (err)
                return cb(err);

            cb(null, _.object(result));
        });

    } else {
        tmp = _.extend(tmp, {
            ACL: fileOptions.s3ObjectACL,
            Bucket: fileOptions.bucketName,
            Key: fileOptions.prefix + fileOptions.name,
            Body: buf
        });

        s3.putObject(tmp, function(err, data) {
            if (err) {
                cb(err);
            } else {
                cb(null, "https://s3-" + fileOptions.region + ".amazonaws.com/" + fileOptions.bucketName + '/' + fileOptions.prefix + fileOptions.name);
            }
        });
    }
};


var convertImageBuffer = function(buffer, arguments, callback) {
    var image = gm(buffer);
    var format = 'PNG';

    _.forIn(arguments, function(argument, key) {        
        if(key === 'format')
            return format = argument;

        if (image[key]) {
            image[key].apply(image, argument);
        }
    });
    
    image.toBuffer(format, callback);
};

var extractOptions = function(schema) {
    if (schema.type) {
        return _.pick(schema, ['bucketName', 'acl', 'prefix', 'name', 'expireAfter', 'styles']);
    }
    return {};
};

// Plugin
exports.plugin = function(schema, options) {
    if (!options.accessKeyId)
        throw "accessKeyId is mandatory";
    if (!options.secretAccessKey)
        throw "secretAccessKey is mandatory";
    if (!options.region)
        options.region = "ap-southeast-1";

    var awsCred = {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        region: options.region
    };

    AWS.config.update(awsCred);

    s3 = new AWS.S3();

    schema.pre('save', function(next) {
        var doc = this;        
        recurr(schema.tree, doc.toObject(), function(err, newDoc) {
            _.extend(doc, newDoc);
            next(err);
        });
    });

    // Recursive walks schema & document & tries to upload all possible S3File fields
    var recurr = function(schema, document, cb) {
        async.mapSeries(_.keys(document), function(key, cb) {
            if (schema[key]) {
                if (matchS3File(schema[key])) {

                    if (checkIfUrlOrB64(document[key]))
                        return cb(null, [key, document[key]]);

                    var schemaOptions = extractOptions(schema[key]),
                        fileOptions = {
                            name: (schemaOptions.name ? schemaOptions.name.call(document) : guid()),
                            file: document[key]
                        };

                    uploadB64ToS3(_.extend(fileOptions, options, schemaOptions), function(err, url) {
                        cb(err, [key, url]);
                    });
                } else if (matchArrayOfS3File(schema[key])) {
                    var schemaOptions = extractOptions(schema[key][0]);
                    async.mapSeries(document[key], function(item, cb) {
                        if (checkIfUrlOrB64(item))
                            return cb(null, item);

                        var fileOptions = {
                            name: schemaOptions.name ? schemaOptions.name.call(item) : guid(),
                            file: item
                        };
                        uploadB64ToS3(_.extend(fileOptions, schemaOptions, options), cb);
                    }, function(err, urls) {
                        cb(err, [key, urls]);
                    });
                } else if (matchArrayOfObject(schema[key])) {
                    async.mapSeries(document[key], function(item, cb) {
                        recurr(schema[key][0], item, cb);
                    }, function(err, arr) {
                        if (err)
                            return cb(err);
                        cb(null, [key, arr]);
                    });
                } else if (matchObject(schema[key])) {
                    recurr(schema[key], document[key], function(err, doc) {
                        if (err)
                            return cb(err);
                        cb(null, [key, doc]);
                    });
                } else {
                    cb(null, [key, document[key]]);
                }
            } else {
                cb(null, [key, document[key]]);
            }
        }, function(err, arr) {
            if (err)
                return cb(err);
            cb(null, _.object(arr));
        });
    };

};

function S3File(path, options) {
    mongoose.SchemaTypes.Mixed.call(this, path, options);
}

// Loads S3File type
exports.loadType = function(mongooseObject) {
    mongoose = mongooseObject;
    var SchemaTypes = mongoose.SchemaTypes;

    S3File.prototype.__proto__ = SchemaTypes.Mixed.prototype;
    SchemaTypes.S3File = S3File;
    mongoose.Types.S3File = Object;
};
