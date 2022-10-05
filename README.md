

# Incapsula
- [Incapsula](#incapsula)
  - [About](#about)
    - [Modes](#modes)
    - [Javascript](#javascript)
  - [Non-Captcha Mode](#non-captcha-mode)
    - [The __utmvc__ Cookie](#the-utmvc-cookie)
      - [Data](#data)
      - [Fingerprints](#fingerprints)
    - [The __reese84__ cookie](#the-reese84-cookie)
      - [Encoding Loops](#encoding-loops)
- [HOW TO RUN](#how-to-run)
  - [RUN WITHOUT SAVING ASTS](#run-without-saving-asts)
- [Reese84 Collector](#reese84-collector)
- [Reese84 Decode Payloads](#reese84-decode-payloads)

## About

Incapsula is the antibot from Imperva. It consists of two modes, the captcha non-invasive mode and the captcha mode. The former is the easiest to pass while the latter is not shy of issuing more bans. 

### Modes

There are two modes in Incapsula, the captcha mode and the non-captcha mode. For the most part, both modes have almost the same requests and cookies like  both have the same `reese84` cookie. However, the captcha mode requires a Recaptcha V2 solved token, and a different

### Javascript

The files served by Incapsula are inherently dynamic, in part because they morphed their encoding functions to make a slight variant of the previous one, so each reload produces a different encoding function. This is evident in the encoding function used for the `reese84` payload and the encoding function used to encode the `___utmvc` cookie. 

## Non-Captcha Mode

The Non-Captcha mode consists of a flow of requests that generate a set of cookies a long the way, and **2** that must be set manually.

Those **2** cookies are :

* `___utmvc` : This is the first cookie that will be required to go forward.
* `reese84` : This cookie is really heavy on fingerprints that get sent in a POST request with the token later being set as a cookie value.


### The __utmvc__ Cookie

The `___utmvc` cookie is the first cookie that must be set manually. It must be noted that on a valid `___utmvc` cookie the server will return
a new value for the `___utmvc` cookie which will be set to `a`. 


#### Data

The contents of the `___utmvc` contains fingerprint data such as properties from the `window`, `navigator` and various other properties found on normal browsers and automation frameworks. It is a string with 3 properties:

* `digest` : The output of the key
* `seed` : The seed in hexadecimal format


The final value is then turned into a `Base64` string in the format: `${payload}digest=${digest}s=${seed}`


#### Fingerprints

The default `fingerprints` can be found at : [utmvc.js](incapsula/payloads/utmvc.js)

```js
 {
  "navigator" : true,
  "navigator.vendor" : `Google Inc.`,
  "navigator.appName" : `Netscape`,
  "navigator.plugins.length==0" : false,
  "navigator.platform" : `Linux x86_64`,
  "navigator.webdriver" : false,
  "plugin_ext" : `no plugins`,
  "ActiveXObject" : false,
  "webkitURL" : true,
  "_phantom" : false,
  "callPhantom" : false,
  "chrome" : true,
  "yandex" : false,
  "opera" : false,
  "opr" : false,
  "safari" : false,
  "awesomium" : false,
  "puffinDevice" : false,
  "__nightmare" : false,
  "domAutomation" : false,
  "domAutomationController" : false,
  "_Selenium_IDE_Recorder" : false,
  "document.__webdriver_script_fn" : false,
  "document.$cdc_asdjflasutopfhvcZLmcfl_" : false,
  "process.version" : false,
  "global.require" : false,
  "global.process" : false,
  "WebAssembly" : true,
  "require('fs')" : false,
  "globalThis==global" : `cannot evaluate`,
  "window.toString()" : `[object Window]`,
  "navigator.cpuClass" : false,
  "navigator.oscpu" : false,
  "navigator.connection" : true,
  "navigator.language=='C'" : `false`,
  "Object.keys(window).length" : `9163`,
  "window.outerWidth==0" : `false`,
  "window.outerHeight==0" : `false`,
  "window.WebGLRenderingContext" : true,
  "window.constructor.toString()" : `function Window() { [native code] }`,
  "Boolean(typeof process !== 'undefined' && process.versions && process.versions.node)" : `false`,
  "document.documentMode" : `undefined`,
  "eval.toString().length" : `33`,
  "navigator.connection.rtt" : `0`,
  "deviceType" : `desktop`,
  "screen.width" : `1920`,
  "screen.height" : `1080`,
  "eoapi" : false,
  "eoapi_VerifyThis" : false,
  "eoapi_extInvoke" : false,
  "eoWebBrowserDispatcher" : false,
  "window.HIDDEN_CLASS" : false,
  "navigator.mimeTypes.length==2" : `true`,
  "navigator.plugins.length==2" : `false`,
  "window.globalThis" : true,
  "navigator.userAgentData.brands[0].brand" : `Chromium`,
  "navigator.userAgentData.brands[1].brand" : `Google Chrome`,
  "navigator.userAgentData.brands[2].brand" : `;Not A Brand`,
  "navigator.plugins['Microsoft Edge PDF Plugin']" : false,
}
```

Each key-value is encoded using the `encodeURIComponent` function and then joining all key-values via a comma, to form one long string
containing the payload.



> *If* the server does not return an `a` as a new cookie value for `___utmvc` then the session will not be valid which will prevent the user from
> going forward.


A succesful `___utmvc` cookie will yield a header response from the server 

`Set-Cookie : ___utmvc=a`



### The __reese84__ cookie

This cookie is particularly heavy in fingerprints that are encoded using a simple [xorshift128](https://en.wikipedia.org/wiki/Xorshift) algorithm. On top of that, each key-value pair in the `reese84` payload is encoded using a series of _For_ and _While_ loops that shuffle, copy, clone, or re-arrange the bytes in a dynamic order.

#### Encoding Loops
```js
//Example of the loops that encode reese84 payload

var ul = window.JSON.stringify(os, function (tb, YZ) {
  return YZ === undefined ? null : YZ;
});
var xY = ul.replace(yv, BP);
var Oa = [];
var yu = 0;

while (yu < xY.length) {
  Oa.push(xY.charCodeAt(yu));
  yu += 1;
}

var Xm = Oa;
var q9 = Xm;
var Un = [];

for (var EN in q9) {
  var Nz = q9[EN];

  if (q9.hasOwnProperty(EN)) {
    Un.push(Nz);
  }
}

var gZ = Un;
var gH = gZ;
var bG = gH.length;
var T2 = 0;

while (T2 + 1 < bG) {
  var mD = gH[T2];
  gH[T2] = gH[T2 + 1];
  gH[T2 + 1] = mD;
  T2 += 2;
}

var gF = gH;
var xq = gF.length;
var Xv = Lx["slice"](0, 22).length;
var lN = [];
var tV = 0;

while (tV < xq) {
  lN.push(gF[tV]);
  lN.push(Lx["slice"](0, 22)[tV % Xv]);
  tV += 1;
}

var EJ = lN;
var fZ = [];

for (var iF in EJ) {
  var hs = EJ[iF];

  if (EJ.hasOwnProperty(iF)) {
    fZ.push(hs);
  }
}

var WD = fZ;
var LD = WD;
var aG = LD.length;
var r4 = 0;

while (r4 + 1 < aG) {
  var XP = LD[r4];
  LD[r4] = LD[r4 + 1];
  LD[r4 + 1] = XP;
  r4 += 2;
}

var fA = LD;
var IF = [];

for (var Ly in fA) {
  var Uz = fA[Ly];

  if (fA.hasOwnProperty(Ly)) {
    var fj = window.String.fromCharCode(Uz);
    IF.push(fj);
  }
}

var th = window.btoa(IF.join(""));

```


It is imperative that each loop is parsed out as the sequence of where each loop is found is essential

Some of these loops can be found inside

xorShift128

Unlike the first cookie, the `___utmvc`cookie, the `reese84` cookie is not set by the user but by the server after the submission of the `reese84` payload containing the heavy fingerprints. 



# HOW TO RUN

> TODO: Document the different ways to run
NODE_TLS_REJECT_UNAUTHORIZED='0' SAVE_ASTS=$(pwd)/ node --trace-warnings --insecure-http-parser tests/testIncapsulaSession.js

## RUN WITHOUT SAVING ASTS

NODE_TLS_REJECT_UNAUTHORIZED='0' node --trace-warnings --insecure-http-parser tests/testIncapsulaSession.js



# Reese84 Collector

To run a custom Reese84 signal collector with a custom payload url follow these steps:

* Get a raw reese84 obfuscated file
  * __Example__ : `https://www.pokemoncenter.com/kie-Yes-him-To-the-To-mocking-and-do-mise-I-prom`
  * __Make sure that is the raw file served by Incapsula!__
* After acquiring the raw reese84 obfuscated file you need to run the [create-collector-script.js](incapsula/reese84/create-collector-script.js) with a custom payload url where you want the raw payloads to be sent
 * __Example__ : `node incapsula/reese84/create-collector-script.js obfuscated-reese84.js https://mywebsite.com/payload`
 * The payload will be sent as a _POST_ request, and it will be encoded using the same encryption that _Incapsula_ uses.
 * When you run the above script the STDOUT will be the collector script source so always pipe the output to a file if you want to save it to a file:
 * __Example__ : `node incapsula/reese84/create-collector-script.js obfuscated-reese84.js https://mywebsite.com/payload > mycustomreese84collector.js`


> Note: It is important to remember that the Reese84 fingerprints are only run ONCE, any subsequent payloads will just submit the previous token that is saved underneath window.localStorage under the key reese84. To always fire the Reese84 payload containing the fingerprints and not just the previous token, make sure to run this `window.localStorage.clear()` in your browser console to clear the cache.

# Reese84 Decode Payloads


Since the payloads are encrypted using the same encryption as _Incapsula_, the same obfuscated reese84 file needs to be used to be able to decrypt the raw payloads.

This is how a raw payload looks like:

```
{"solution":{"interrogation":{"p":"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","st":1638494288,"sr":3008259749,"cr":1031891680},"version":"beta"},"old_token":"3:N6YWcDB3dNdmfLyN59nT8w==:ExEV0/B9QUZyNvcD734jDzmxvEqSBrJBXyvHg4Ocz6yf65xX/5ZuwphrL77e4/QQQYJRmikvo46nI4UewPP/kEmuAPtE9gyRNhT/TfBImU+c6XqLJ6bVNdyGqVjNSeFOy2PP18UUYbV22wFGwBeEdMK0Q26Gzg4Ah3pf6MGdPxnIvCCKu4Jw2FinQlTniCqsvV3Bl48/+2ZIW6Ymp5KkJSjsY7ZcJwV/iFdk23XfVJ6u6ExhEK+3fw+iBsUXmnl+t6DC07DvDWbVe/kiteZt7OVXI08x6RPCj7LU/dPgPuHl2tuXb02Afsz/RIProC+1aRliPvHypZ5AjPrIlSO1G48BIhFO5ASsO0ugBVvtCQhvfIngWZsq9vEqfYYjkxIed4iEV2qvfdWOeHzEX5ZN3H7znCFoSPMWuflE70J8xMU17i5SPVsZ/BLjvkRynRPr:mLZmXXFF/qaDf6oLM7yhndv9QHNPt6lyo33jhrME9rI=","error":null,"performance":{"ac":1,"total":521,"interrogation":161}}
```

To decode one or more raw reese84 payloads follow these steps:

* Put one or more payloads into a file.
  * __Always make sure that your payloads are in an array, even if it's only one raw payload__
  * __Example__ : `[{"solution":{"interrogation":{"p":"...","st":1638494288,"sr":3008259749,"cr":1031891680},"version":"beta"},"old_token":"...","error":null,"performance":{"ac":1,"total":521,"interrogation":161}}, {"solution":{"interrogation":{"p":"...","st":1638494288,"sr":3008259749,"cr":1031891680},"version":"beta"},"old_token":"...","error":null,"performance":{"ac":1,"total":521,"interrogation":161}}]`
* Now, you are ready to run [decode-payload.js](incapsula/reese84/decode-payload.js)
  * __Example__ : `node incapsula/reese84/decode-payload.js obfuscated-reese84.js rawpayloads.txt`

> Note: You need to use the same obfuscated-reese84.js file that was used to make the collector, DO NOT USE THE COLLECTOR SCRIPT! 
