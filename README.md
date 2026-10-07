# VeriTrust Wallet

The holder app for **VeriTrust**, a verifiable-credentials platform. It's published on the App Store as
**VeriTrust**. Users receive credentials from the
[VeriTrust Issuer Portal](https://github.com/sophialiuhk2007/credo-project-v2), store them on the device,
and share only the fields a verifier asks for.

## Features

- **Receive credentials** by scanning an OpenID4VCI credential-offer QR code. Credentials are SD-JWT VCs.
- **Selective disclosure:** the app decodes SD-JWT disclosures, so a holder can present a subset of
  claims in response to an OpenID4VP / Presentation Exchange request.
- **Apple Wallet:** credentials can be added to Apple Wallet as passes.
- **On-device agent:** a [Credo](https://github.com/openwallet-foundation/credo-ts) agent with an Askar
  wallet runs inside the app. No custodial backend holds user credentials.

## Stack

React Native 0.79 · TypeScript · Credo (`@credo-ts/react-native`, `openid4vc`, `askar`)

## Layout

```
App.tsx            navigation + tabs
hooks/             useAgent, useCredentialOffer, useCredentials, useVerificationRequest
components/        credential list / detail modal / input UI
utils/             base64url + SD-JWT helpers
ios/, android/     native projects
```

## Running

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios        # or: npm run android
```
