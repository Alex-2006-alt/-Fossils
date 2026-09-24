ALTER TABLE User ADD COLUMN sessionVersion INTEGER NOT NULL DEFAULT 0;
ALTER TABLE User ADD COLUMN disabledAt DATETIME;
ALTER TABLE User ADD COLUMN emailVerifiedAt DATETIME;
ALTER TABLE Family ADD COLUMN faceRecognitionEnabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE Family ADD COLUMN locationVisible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE Media ADD COLUMN familyId TEXT NOT NULL DEFAULT '';
ALTER TABLE Media ADD COLUMN deletedAt DATETIME;
UPDATE Media SET familyId = (SELECT familyId FROM User WHERE User.id = Media.uploaderId);
CREATE INDEX Media_familyId_deletedAt_idx ON Media(familyId, deletedAt);
CREATE TABLE RateLimitBucket (id TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL DEFAULT 0, expiresAt DATETIME NOT NULL);
CREATE INDEX RateLimitBucket_expiresAt_idx ON RateLimitBucket(expiresAt);
CREATE TABLE AccountToken (id TEXT PRIMARY KEY NOT NULL, tokenHash TEXT NOT NULL, userId TEXT NOT NULL, purpose TEXT NOT NULL, expiresAt DATETIME NOT NULL, usedAt DATETIME);
CREATE UNIQUE INDEX AccountToken_tokenHash_key ON AccountToken(tokenHash);
CREATE INDEX AccountToken_userId_idx ON AccountToken(userId);
-- Existing raw invitation tokens are revoked; newly issued tokens are stored only as hashes.
UPDATE Invitation SET expiresAt = CURRENT_TIMESTAMP WHERE usedAt IS NULL;
-- Remove cross-family face assignments while retaining the face and original photo.
UPDATE Face SET personId = NULL, isVerified = false WHERE personId IN (
 SELECT Person.id FROM Person WHERE Person.familyId != (SELECT Media.familyId FROM Media WHERE Media.id = Face.mediaId)
);
UPDATE Person SET photoCount=(SELECT COUNT(DISTINCT mediaId) FROM Face WHERE Face.personId=Person.id);


ALTER TABLE MediaProcessingJob ADD COLUMN leaseId TEXT;
