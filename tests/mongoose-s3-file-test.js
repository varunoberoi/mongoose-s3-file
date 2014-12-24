var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    S3FileUploader = require('../'),
    chai = require('chai'),
    should = chai.should();


var db = mongoose.connect('mongodb://localhost/mongoose-s3file-test');

var UserSchema, User;

var imageBase64 = 'data:image/jpg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAA3AAD/4QMraHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjAtYzA2MCA2MS4xMzQ3NzcsIDIwMTAvMDIvMTItMTc6MzI6MDAgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjRGNUExN0VFOUU4RDExRTBCNjQwREYxNzhEOEEwRUZEIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjRGNUExN0VEOUU4RDExRTBCNjQwREYxNzhEOEEwRUZEIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDUzUgTWFjaW50b3NoIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QjE5RTdFMzY5NTlGMTFFMDhERDc4QTk5RkZBNjYzNzQiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QjE5RTdFMzc5NTlGMTFFMDhERDc4QTk5RkZBNjYzNzQiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7/7gAhQWRvYmUAZMAAAAABAwAQAwMGCQAACYkAAAr+AAANLv/bAIQABwUFBQUFBwUFBwoHBgcKDAkHBwkMDgsLDAsLDhEMDAwMDAwRDhAREREQDhUVFxcVFR8fHx8fIyMjIyMjIyMjIwEICAgODQ4bEhIbHhgUGB4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMj/8IAEQgBLAGQAwERAAIRAQMRAf/EALwAAQADAQEBAQAAAAAAAAAAAAAEBQYDAgEIAQEAAAAAAAAAAAAAAAAAAAAAEAACAgAFAwMFAQAAAAAAAAACAwEEADBAUBIREwUiMxQggKAhMTQRAAEBBQYEBQMFAAAAAAAAAAECAEBQEVEwITFBYRJxgbEikaEyUgPBEyMggPDR8RIBAAAAAAAAAAAAAAAAAAAAoBMBAAEBBgYCAgMBAAAAAAAAAREhAEAxQVGRMFBhcYGhscHw0SCg4YD/2gAMAwEAAhEDEQAAAP0iAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4RjweT4TT2AAAAAAAAAAAAAAAAAAAAD4VJTnIAHUty1PYAAAAAAAAAAAAAAAAAABzKErQAAASTTnQAAAAAAAAAAAAAAAAAAFCVIAAAAJZqQAAAAAAAAAAAAAAAAACMZU+AAAAAGiLIAAAAAAAAAAAAAAAAAGfKsAAAAAE40wAAAAAAAAAAAAAAAAAM2V4AAAAAPRsgAAAAAAAAAAAAAAAAAZwrgAAAAAezYgAAAAAAAAAAAAAAAAAoSpAAAAABLNSAAAAAAAAAAAAAAAAACqKAAAAAAE80oAAAAAAAAAAAAAAAAAM6VoAAAAAJhqAAAAAAAAAAAAAAAAAAZ0rQAAAAATDUAAAAAAAAAAAAAAAAAArDPAAAAAAty9AAAAAAAAAAAAAAAAABxMiAAAAADSFgAAAAAAAAAAAAAAAAAAVZnwAAAAWxfAAAAAAAAAAAAAAAAAAA8mNAAAABrTuAAAAAAAAAAAAAAAAAAAZkggAAAlmpAAAAAAAAAAAAAAAAAAABSlKAAAC4LwAAAAAAAAAAAAAAAAAAAjlEQAAAASS8J4AAAAAAAAAAAAAAAABHKwriOAAAAADuWxZnQAAAAAAAAAAAAAA4lcVhFAAAAAAAAPpOLEsDoAAAAAAAAAAACKZw4AAAAAAAAAAAAtS/AAAAAAAAAAB4MmcgAAAAAAAAAAAAWpfgAAAAAAAAAFMUgAAAAAAAAAAAAANIWAAAAAAAAAAMmRwAAAAAAAAAAAAASTVgAAAAAAAAHIyAAAAAAAAAAAAAAANWSQAAAAAAAAV5mwAAAAAAAAAAAAAAX5agAAAAAAAApSlAAAAAAAAAAAAAABbF8AAAAAAAADNleAAAAAAAAAAAAAACeaUAAAAAAAAGROIAAAAAAAAAAAAAAJJqwAAAAAAADyY0AAAAAAAAAAAAAAA6GwAAAAP/2gAIAQIAAQUB/Ns//9oACAEDAAEFAfzbP//aAAgBAQABBQH7dJmBibKIx8uvj5tfHzUYEhONq/mGXxjDGm2foW01EF+MAYmOzmYrixblsZCXEkgMWDs3kJiSyqzO23ZXthK5mSnLpu7gbJfLqzMplxfsl338wC4lsl738wB5nsnkI9eZV/0bJfiO3mU183bJeOSbmVWEtuyXh6OzKg8n7JeDkrM8ePq2Ro815lIOCdls1QKMqrVFkbMUch/mUkO2rZ7gcHZFYObto8hGT4+PVs5vUvFmx38lDyRK7aWbIb1Lwd/BvazNW9qsLvjOAMDjWk1YYZfGMHZczRRMxgLjgwF5ZYFiz1L3igWOY2dRWtyM6YygBYwmnqqlnhOlvs/Wspu7gaR59xusrs7TdG0uC9dXPmnRXS6I11Auq9F5Atf4+fXorpdX66lPR+iaXJuurz0foS69Nev3Mn//2gAIAQICBj8BbZ//2gAIAQMCBj8BbZ//2gAIAQEBBj8B/bpMmQb1hvX5FsfJsT4NNJmIXMtL40z1LTWZ/p3ILfkTLUNuQZiEblmQbYi5HWxmMMw25JmIOkZjGzByNxgxVnkG3G8m02K9SekFCcgOtqnW6C8hahVDOC8hapTUygqVVEvD/bVH8ygqTnO1ByTfBdmSfragDBRAIgu73C1TpfBd3tPW1Wqgl4wVSai61mcVXwZXyJuVidbP7i8MkwcpqJNI2SUUxhBoq+xSMheeUJQeNitVJCEdyhwYBIkkWJKbwcQ0idpof7gncq+mbfjTzLdyjwte1V1Mml8olqGmggv3coBvxpnqWvVIUFzlMXFrzuGrd4KfMN2qBeaqOAbvPLJ52/MZg4GjuVqwDFas3v7S/ScDR2HxDiX3ar1J6Oqla3PoVlgeDopVA/pPI8nMj3EB/Umh6uaE839Saifg5y9oA+r+NQXNaql/RxcjLHKAJ4iy/9oACAECAwE/EP7tn//aAAgBAwMBPxD+7Z//2gAIAQEDAT8Q/wCdI4gxVg92xLxV+LJ0/B4t1O79WFYQ6q+rHTNmM8rUCkBVXALINBwaDbG0lugyOx/GkA5mT3LPgbyTZsGAuCcoWgLN+rMgZqrjDg4+320/djhk3Ojycbsiw0mI4c/Mdphz8cmxwumstnKyJVzXiMiTDDrk25K0vi46r/OKgpgKtpPZyXH4oh+JDw2GSTB5IIlq3ycVwcS3Nggg5Ipll3J4phJq+1yVjMETsjPxxWwGq+A5LoklOol4tWXVMLHqeSw2QHyU4vQcl4P3yWJOM3ih+uLJpQeU/XJXPxQ7svdsKPEUSq7cDk1EvEDCFXzwyrzJMAYzbABBQMDk2W0ku5FkUhCMJ1OFrwNzV98olwZPu4++DPmJ4qvnlNPtn1wTc0NxX65RLVRkq7FjSklFxV4I0EGbOLRkj7PjBbGpyOfChkrsLPUj/HA/dsexoobHFQrGrXY2iEvvG2NoUXo4dy/HT0ya7FbSwz7BtjaYGTovVyRFQwRhtHAaWPctHCOv6K+rCDMZCTteZw/g5elniqZGg8XjCpaWWFLVXXOwiCMjUS7LxAy2xgMBoZF7YFrQ2Zy7XaFTHbyL6s5NNdcjddN6OwoX1ZKp8q6ajKneKX+b8Y8lFz1I+w+r/wB4PwP8ueA9V8H3f4dM7kfdzmvwH7X+F6T1P1c9KFjtNL/Nek3pcuxT5RyCdHGlvwv/2Q==';

describe('Testing S3File Plugin', function() {

    it('should be able to load type', function(done) {
        S3FileUploader.loadType(mongoose);
        should.exist(mongoose.SchemaTypes.S3File);
        done();
    });

    it('should be able to create schema with S3File type', function(done) {
        UserSchema = new Schema({
            name: String,
            profilePicture: {
                type: mongoose.SchemaTypes.S3File,
                styles: {
                    small: {
                        resize: [150, 150]
                    },
                    medium: {
                        resize: [120, 120]
                    },
                    original: {
                    	format: 'JPEG'
                    }
                }
            },
            images: [{
            	type: mongoose.SchemaTypes.S3File,
            	prefix: 'images'
            }]
        });
        done();
    });

    it('should be able to load plugin', function(done) {
        UserSchema.plugin(S3FileUploader.plugin, {
            accessKeyId: process.env.accessKeyId,
            secretAccessKey: process.env.secretAccessKey,
            region: process.env.region,
            bucketName: process.env.bucketName,
            acl: 'public-read',
            prefix: 'user'
        });

        User = mongoose.model('User', UserSchema);

        done();
    });

    it('should be able to upload image to s3', function(done) {
        new User({
            name: 'Test User',
            profilePicture: imageBase64,
            images: [imageBase64, imageBase64]
        }).save(function(err, user) {
            if (err)
                return done(err);            
            user.profilePicture.small.should.match(/^http/i);
            user.profilePicture.medium.should.match(/^http/i);
            user.profilePicture.original.should.match(/^http/i);
            user.images[0].should.match(/^http/i);
            user.images[1].should.match(/^http/i);
            done();
        });
    });


    after(function(done) {
        db.connection.db.dropDatabase();
        db.connection.close();
        done();
    });
});
