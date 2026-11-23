# Travel

A travel app. First stop: Indonesia.

Live site: https://travel-ca8f9.web.app

![Old-school crime-game style cover of Indonesia: Bali at sunset, a clifftop club in Uluwatu, Borobudur, a full moon party and five women in sunglasses](https://travel-ca8f9-media.s3.us-east-2.amazonaws.com/public/readme/cover.jpg)

## How it is built

| Part | Service | Job |
| --- | --- | --- |
| Web app | Firebase Hosting, project `travel-ca8f9` | Serves the site from `public/`. |
| Data | Firebase Realtime Database (not set up yet) | Stores the app's data. |
| Pictures | Amazon S3, bucket `travel-ca8f9-media` (us-east-2) | Stores the pictures. |

The app does not use Firestore. One database keeps it simple.

Only files under `public/` in the bucket are open to everyone. The rest of the bucket is private.

## Deploy

```bash
firebase deploy --only hosting
```
