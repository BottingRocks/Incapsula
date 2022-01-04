

const Captcha = require(`2captcha`);
const cheerio = require(`cheerio`);
const fetchCookie = require(`fetch-cookie`);
const fs = require(`fs`);
const HttpsProxyAgent = require(`https-proxy-agent`);
const inquirer = require(`inquirer`);
const nodeFetch = require(`node-fetch`);
const path = require(`path`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);

const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const DEFAULT_UTMVC_PAYLOAD = require(`../incapsula/payloads/utmvc.js`);

const SAVE_ASTS = process.env.SAVE_ASTS || false;

class IncapsulaError extends Error {}
class IncapsulaSession {
  //To run this make sure to pass the --insecure-http-parser flag see:https://github.com/nodejs/node/issues/27711

  constructor({ proxyUrl, userAgent, cookieJar, _2captchaKey, askForCaptcha } = {}) {

    this.agent = proxyUrl !== undefined ? new HttpsProxyAgent(proxyUrl) : undefined;
    //this.userAgent = userAgent === undefined ? `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0` : userAgent;
    this.userAgent = userAgent ;

    this.cookieJar = cookieJar || new fetchCookie.toughCookie.CookieJar();
    this.fetch = fetchCookie(nodeFetch, this.cookieJar, false);
    //this.fetch = nodeFetch;
    this.utmvc = null;
    this.reese84 = null;
    this.reese84Url = null;
    this.reese84Token = null;
    this._2captchaKey = _2captchaKey;
    this.askForCaptcha = askForCaptcha || false;

    this.captchaSolver = new Captcha.Solver(_2captchaKey);
  }

  async go({url, utmvc, reese84, gCaptchaToken}){
    utmvc = utmvc || DEFAULT_UTMVC_PAYLOAD;
    reese84 = reese84 || DEFAULT_REESE84_PAYLOAD;

    try{

      const mainPage = await this.fetch(url, {
        headers : this.getHeaders({
          pageType : `main`,
          url,
        }),
        agent : this.agent
      });


      const body = await mainPage.text();
      SAVE_ASTS && this.saveFile(`main.html`, body);
      const incapsulaModes = this.parseIncapsulaScripts({url, html : body});

      let hasDoneReese84 = false, hasDoneUtmvc = false;
      if(incapsulaModes.utmvc){
        await this.setUtmvc({url : incapsulaModes.utmvc, payloadData : utmvc, referer : url });
        hasDoneUtmvc = true;
      }

      if(incapsulaModes.reese84){
        await this.doReese84Mode({url : incapsulaModes.reese84, payloadData : reese84, referer : url });
        hasDoneReese84 = true;
      }


      if(incapsulaModes.iframe){
        const iframeUrl = incapsulaModes.iframe.url;
        const iframePage = await this.fetch(iframeUrl, {
          headers : this.getHeaders({
            pageType : `iframe`,
            url : iframeUrl,
            referer : `${new URL(url).origin}`,
          }),
          agent : this.agent
        });
        const iframePageBody = await iframePage.text();
        const iframeModes = this.parseIncapsulaScripts({ url : incapsulaModes.iframe.url, html : iframePageBody});

        //await this.doFaviconMode({url, referer : `${new URL(url).origin}`});

        switch(incapsulaModes.iframe.type){
          case 42:

            if(iframeModes.reese84 && !hasDoneReese84){
              await this.doReese84Mode({url : iframeModes.reese84, payloadData : reese84, referer : iframeUrl});
            }

            break;

          case 31:
            //Captcha
            if(iframeModes.utmvc && !hasDoneUtmvc){
              await this.setUtmvc({url : iframeModes.utmvc, payloadData : utmvc, referer : iframeUrl});
            }

            if(iframeModes.reese84 && !hasDoneUtmvc){
              await this.doReese84Mode({url : iframeModes.reese84, payloadData : reese84, referer : iframeUrl});
            }
            console.log(`doing captchas`)
            await this.doCaptchaMode({url : incapsulaModes.iframe.url});

            break;
          case 23:
            //Banned
            throw new IncapsulaError(`Need to implement this iframe mode`);
            //To do: Implement captcha and banned state
        }

      }
      setTimeout(function(){
        //put your code in here to be delayed by 2 seconds
      },2000);

      const sleep = (d) => new Promise((r) => setTimeout(r, d));

      await sleep(3000);
      const mainPageRefresh = await this.fetch(url, {
        headers : this.getHeaders({
          pageType : `refresh`,
          url,
        }),
        agent : this.agent
      });

      const mainPageRefreshBody = await mainPageRefresh.text();
      SAVE_ASTS && this.saveFile(`main-refresh.html`, mainPageRefreshBody);

      if([403, 400, 401].includes(mainPageRefresh.status)){
        return { success : false, error : mainPageRefreshBody, cookies : this.getCookies(url)};
      }else{
        return { success : true, error : ``, cookies : this.getCookies(url)};
      }
    }catch(e){
      return { success : false, error : e, cookies : this.getCookies(url)};
    }

  }

  async doReese84Mode({url, payloadData, referer}){

    await this.setReese84({ payloadUrl : url, referer });
    await this.doFaviconMode({url, referer : `${new URL(url).origin}`});
    await this.postReese84CreateRequest({ payloadUrl : url, data : payloadData, referer });
    //await this.postReese84UpdateRequest({oldToken : this.reese84Token, referer});

  }

  async setReese84({ payloadUrl, referer}){
    const reese84Page = await this.fetch(payloadUrl.split(`?d=`)[0],{
      headers : this.getHeaders({
        pageType : `reese84`,
        url : payloadUrl,
        referer,
      }),
      agent : this.agent
    });

    const reese84PageBody = await reese84Page.text();

    SAVE_ASTS && this.saveFile(`reese84.js`, reese84PageBody);

    this.reese84 = Reese84.fromString(reese84PageBody);

  }

  async setUtmvc({url, payloadData, referer}){

    const utmvcPage = await this.fetch(url,{
      headers : this.getHeaders({
        pageType : `utmvc`,
        url,
        referer,
      }),
      agent : this.agent
    });

    const utmvcPageBody = await utmvcPage.text();

    SAVE_ASTS && this.saveFile(`utmvc.js`, utmvcPageBody);

    this.utmvc = Utmvc.fromString(utmvcPageBody);

    const payload = this.utmvc.createPayload(payloadData);
    const payloadUrl = this.utmvc.createPayloadUrl({payloadUrl : url});
    const utmvcEncodedCookie = this.utmvc.encodeUtmvcData(payload, this.getCookies(url));

    this.setCookies(`___utmvc=${utmvcEncodedCookie}`, url);
    //Do a refresh to attempt to get an `a` response.

    const payloadPage = await this.fetch(payloadUrl, {
      headers : this.getHeaders({
        pageType : `utmvc-image`,
        url,
        referer,
      }),
      agent : this.agent
    });
    const payloadPageBody = await payloadPage.text();

  }

  async postReese84CreateRequest({ payloadUrl, data, referer}) {

    this.reese84Url = payloadUrl;
    const payload = JSON.stringify(this.reese84.createPayload(data));
    /*
    const payload = `{"solution":{"interrogation":{"p":"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","st":1641253201,"sr":3586085370,"cr":494958259},"version":"stable"},"old_token":null,"error":null,"performance":{"interrogation":212}}`;
    */
    const reese84Page = await this.fetch(this.reese84Url, {
      headers : this.getHeaders({
        pageType : `reese84Create`,
        url : this.reese84Url,
        referer,
        bodyLength : payload.length
      }),
      agent : this.agent,
      method : `POST`,
      body : payload
    });

    const reese84PageBody = await reese84Page.text();

    SAVE_ASTS && this.saveFile(`reese84-post-response.html`, reese84PageBody);

    const parsed = JSON.parse(reese84PageBody);

    this.reese84Token = parsed[`token`];
    this.setCookies(`reese84=${this.reese84Token}`, this.reese84Url);



  }

  async postReese84UpdateRequest({oldToken, referer}){

    if (oldToken === undefined) {
      oldToken = this.reese84Token;
    }

    const reese84Page = await this.fetch(this.reese84Url, {
      headers : this.getHeaders({
        pageType : `reese84Update`,
        url : this.reese84Url,
        referer,
        bodyLength : oldToken.length
      }),
      agent : this.agent,
      method : `POST`,
      body : `"${oldToken}"`
    });

    const reese84PageBody = await reese84Page.text();
    const parsed = reese84PageBody === `` ? {} : JSON.parse(reese84PageBody);

    if(Object.keys(parsed).length){
      this.reese84Token = parsed[`token`];
      this.setCookies(`reese84=${oldToken}`, this.reese84Url);
    }

  }

  async doCaptchaMode({url}){
    const captchaPage = await this.fetch(url, {
      headers : this.getHeaders(`main`),
      agent : this.gent,
    });

    const captchaPageBody = await captchaPage.text();
    const submitCaptchaUrl = this.findCaptchaUrl(url, captchaPageBody);

    const getGCaptchaToken  = await inquirer.prompt({
      type : `input`,
      name : `gCaptchaToken`,
      message : `What is the gCaptchaToken?`
    });

    const gCaptchaToken = getGCaptchaToken.gCaptchaToken;

    const submitCaptchaPage = await this.fetch(submitCaptchaUrl, {
      headers : this.getHeaders(`post`),
      agent : this.agent,
      method : `POST`,
      body : `g-recaptcha-response=${gCaptchaToken}`
    });

    const submitCaptchaPageBody = await submitCaptchaPage.text();

    if(submitCaptchaPage.status !== 200){
      throw new IncapsulaError(`Incapsula did not return a 200 error. It returned:${submitCaptchaPage.status}. Body:${submitCaptchaPageBody}`);
    }
  }

  async doFaviconMode({url, referer}){
    const faviconUrl = `${new URL(url).origin}/favicon.ico`;

    await this.fetch(faviconUrl, {
      headers : this.getHeaders({
        pageType : `favicon`,
        url : faviconUrl,
        referer,
      }),
      agent : this.agent
    });

  }

  getHeaders(options = {}){
    const pageType = options.pageType || `main`;
    const url = options.url;
    const bodyLength = options.bodyLength;
    const referer = options.referer;
    const cookies = this.getCookies(url);

    switch(pageType){
      case 'main':
        return {
          'Host': new URL(url).host,
          'User-Agent': this.userAgent,
          'Accept': `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language': `en-US,en;q=0.5`,
          'Accept-Encoding': `gzip, deflate, br`,
          'Connection': `keep-alive`,
          'Upgrade-Insecure-Requests': `1`,
          'Sec-Fetch-Dest': `document`,
          'Sec-Fetch-Mode': `navigate`,
          'Sec-Fetch-Site': `none`,
          'Sec-Fetch-User': `?1`
        };
      case 'refresh':
        return {
          'Host': new URL(url).host,
          'User-Agent': this.userAgent,
          'Accept': `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language': `en-US,en;q=0.5`,
          'Accept-Encoding': `gzip, deflate, br`,
          'Connection': `keep-alive`,
          'Cookie' : '',
          'Upgrade-Insecure-Requests': `1`,
          'Sec-Fetch-Dest': `document`,
          'Sec-Fetch-Mode': `navigate`,
          'Sec-Fetch-Site': `cross-site`,
          'Pragma': `no-cache`,
          'Cache-Control': `no-cache`,
        };
      case 'utmvc-image':
        return {
          'Host': new URL(url).host,
          'User-Agent': this.userAgent,
          'Accept' : `image/avif,image/webp,*/*`,
          'Accept-Language': `en-US,en;q=0.5`,
          'Accept-Encoding': `gzip, deflate, br`,
          'Referer' : referer,
          'Connection': `keep-alive`,
          'Cookie' : '',
          'Sec-Fetch-Dest' : `image`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case 'utmvc':
      case 'reese84':
        return {
          'Host': new URL(url).host,
          'User-Agent': this.userAgent,
          'Accept' : `*/*`,
          'Accept-Language': `en-US,en;q=0.5`,
          'Accept-Encoding': `gzip, deflate, br`,
          'Referer' : referer,
          'Connection': `keep-alive`,
          'Cookie' : '',
          'Sec-Fetch-Dest' : `script`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case 'reese84Create':
      case 'reese84Update':
        return {
          'Host': new URL(url).host,
          'Connection' : `keep-alive`,
          'Content-Length' : String(bodyLength),
          'Accept' : `application/json; charset=utf-8`,
          'Content-Type' : `text/plain; charset=utf-8`,
          'User-Agent': this.userAgent,
          'Origin' : new URL(url).origin,
          'Sec-Fetch-Site' : `same-origin`,
          'Sec-Fetch-Mode' : `cors`,
          'Sec-Fetch-Dest' : `empty`,
          'Referer' : referer,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Cookie' : '',
        };

      case 'favicon':
        return {
          'Host': new URL(url).host,
          'User-Agent': this.userAgent,
          'Accept' : `image/avif,image/webp,*/*`,
          'Accept-Language': `en-US,en;q=0.5`,
          'Accept-Encoding': `gzip, deflate, br`,
          'Referer' : referer,
          'Connection': `keep-alive`,
          'Cookie' : '',
          'Sec-Fetch-Dest' : `image`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case 'iframe':
        return {
          'Host': new URL(url).host,
          'User-Agent': this.userAgent,
          'Accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language': `en-US,en;q=0.5`,
          'Accept-Encoding': `gzip, deflate, br`,
          'Referer' : referer,
          'Connection': `keep-alive`,
          'Cookie' : '',
          'Upgrade-Insecure-Requests': `1`,
          'Sec-Fetch-Dest': `iframe`,
          'Sec-Fetch-Mode': `navigate`,
          'Sec-Fetch-Site': `same-origin`,
        }
      case 'captcha':
        return {

        };
    }

  }

  parseIframeUrl(html){

    const incapUrl = html.match(/\<iframe id\="main-iframe" src\="(.*?)(?=")/);

    if(!incapUrl){
      throw new IncapsulaError(`Could not parse iframe url:${html}`);
    }

    return incapUrl[1];
  }

  parseIncapsulaScripts({url, html}){

    const result = {
      'utmvc' : this.findUtmvcUrl(url, html),
      'reese84' : this.findReese84Url(url, html),
      'iframe' : false,
    };

    const findIframe = `<iframe id="main-iframe"`;
    const hasIframe = html.indexOf(findIframe) !== -1;

    if(hasIframe){

      const iframeQuery = this.parseIframeUrl(html);

      if(iframeQuery){
        const typeNumber = iframeQuery.split(`&`)[0].split(`=`)[1];
        const parsedUrl = new URL(url);
        result[`iframe`] = {
          'type' : Number(typeNumber),
          'url' : `${parsedUrl.origin}${this.parseIframeUrl(html)}`
        };
      }
    }

    return result;
  }

  findUtmvcUrl( url, body ) {
    const $ = cheerio.load(body);
    let utmvcUrl = false;

    $(`script`).each((index) => {

      const script = $(`script`)[index];
      const source = script.attribs.src;

      if(source !== undefined && source.startsWith(`/_Incapsula_Resource?`)){
        const parsedUrl = new URL(url);
        utmvcUrl = `${parsedUrl.origin}${source}`;
      }

    });

    return utmvcUrl;

  }

  findReese84Url( url, body ) {
    const $ = cheerio.load(body);
    let reese84Url = false;

    $(`script`).each((index) => {

      const script = $(`script`)[index];
      const source = script.attribs.src;

      if(((script.attribs.defer === ``) || (script.attribs.async === ``))
      && !source.startsWith(`http`) && !source.startsWith(`/_Incapsula_Resource?`)){
        const parsedUrl = new URL(url);
        reese84Url = `${parsedUrl.origin}${source}?d=${parsedUrl.host}`;
      }

    });

    return reese84Url;

  }

  findCaptchaUrl(url, body ) {
    const incapUrl = body.match(/\xhr.open\("POST", "(.*?)(?=")/);

    if (incapUrl) {
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[1]}`;
    }

    return false;

  }

  getCookies(url) {
    return this.cookieJar.getCookieStringSync(url);
  }

  setCookies(value, url) {
    this.cookieJar.setCookieSync(`${value}`, url);
  }

  saveFile(savePath, source) {
    const rawSrcPath = path.join(SAVE_ASTS, `${savePath}`);

    !fs.existsSync(path.join(SAVE_ASTS)) && fs.mkdirSync(path.join(SAVE_ASTS), parseInt(`0744`, 8));

    fs.writeFileSync(rawSrcPath, source);
  }
}


module.exports = IncapsulaSession;
