mongoose-s3-file
================

Introduces a new S3File schema type, to seamlessly upload Base64 encoded files to amazon S3

Usage

```js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const S3FileUploader = require("mongoose-s3-file");


const UserSchema = new Schema({
  userName: {
    type: String,
    trim: true
  },
  profilePic: {
    type: mongoose.SchemaTypes.S3File,
    prefix: "users/"
  }, 
  description: String
});


UserSchema.plugin(require("mongoose-timestamp"));
UserSchema.plugin(S3FileUploader.plugin, {
  accessKeyId: "your s3 access id",
  secretAccessKey: "you s3 access key",
  region: "region",
  bucketName: "bucketname",
  acl: "public-read",
  prefix: "",
  excludeKeys: "description"
});
```