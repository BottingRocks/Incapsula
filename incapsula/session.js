

const Captcha = require(`2captcha`);
const cheerio = require(`cheerio`);
//const fetchCookie = require(`fetch-cookie`);
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

const { promisify } = require('util')
const tough = require('tough-cookie')

function fetchCookieDecorator (fetch, jar, ignoreError = true) {
  fetch = fetch || window.fetch
  jar = jar || new tough.CookieJar()

  const getCookieString = promisify(jar.getCookieString.bind(jar))
  const setCookie = promisify(jar.setCookie.bind(jar))

  async function fetchCookie (url, opts) {
    opts = opts || {}

    // Prepare request
    const cookie = await getCookieString(typeof url === 'string' ? url : url.url)

    if (cookie) {
      if (url.headers && typeof url.headers.append === 'function') {
        url.headers.append('Cookie', cookie)
      } else if (opts.headers && typeof opts.headers.append === 'function') {
        opts.headers.append('Cookie', cookie)
      } else {
        opts.headers = Object.assign(
          opts.headers || {},
          cookie ? { Cookie: cookie } : {}
        )
      }
    }

    // Actual request
    const res = await fetch(url, opts)

    // Get cookie header
    let cookies = []

    if (res.headers.getAll) {
      // node-fetch v1
      cookies = res.headers.getAll('set-cookie')
      // console.warn("You are using a fetch version that supports 'Headers.getAll' which is deprecated!")
      // console.warn("In the future 'fetch-cookie-v2' may discontinue supporting that fetch implementation.")
      // console.warn('Details: https://developer.mozilla.org/en-US/docs/Web/API/Headers/getAll')
    } else {
      // node-fetch v2
      const headers = res.headers.raw()
      if (headers['set-cookie'] !== undefined) {
        cookies = headers['set-cookie']
      }
    }

    // Store all present cookies
    await Promise.all(cookies.map((cookie) => setCookie(cookie, res.url, { ignoreError })))

    return res
  }

  fetchCookie.toughCookie = tough

  return fetchCookie
}

fetchCookieDecorator.toughCookie = tough;

class IncapsulaError extends Error {}
class IncapsulaSession {
  //To run this make sure to pass the --insecure-http-parser flag see:https://github.com/nodejs/node/issues/27711

  constructor({ proxyUrl, userAgent, cookieJar, _2captchaKey, askForCaptcha } = {}) {

    this.agent = proxyUrl !== undefined ? new HttpsProxyAgent(proxyUrl) : undefined;
    //this.userAgent = userAgent === undefined ? `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0` : userAgent;
    this.userAgent = userAgent ;

    this.cookieJar = cookieJar || new fetchCookieDecorator.toughCookie.CookieJar();
    this.fetch = fetchCookieDecorator(nodeFetch, this.cookieJar, false);
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
            console.log(`doing captchas`, incapsulaModes);
            await this.doCaptchaMode({url : incapsulaModes.iframe.url});

            await this.fetch(url, {
              headers : this.getHeaders({
                pageType : `main`,
                url,
              }),
              agent : this.agent
            });

            break;
          case 23:
            //Banned
            throw new IncapsulaError(`Need to implement this iframe mode`);
            //To do: Implement captcha and banned state
        }

      }

      let mainPageRefresh = await this.fetch(url, {
        headers : this.getHeaders({
          pageType : `refresh`,
          url,
        }),
        agent : this.agent
      });

      let mainPageRefreshBody = await mainPageRefresh.text();
      SAVE_ASTS && this.saveFile(`main-refresh.html`, mainPageRefreshBody);

      mainPageRefresh = await this.fetch(url, {
        headers : this.getHeaders({
          pageType : `refresh`,
          url,
        }),
        agent : this.agent
      });

      mainPageRefreshBody = await mainPageRefresh.text();
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

    const payload = this.reese84.createPayload(data);

    const reese84Page = await this.fetch(this.reese84Url, {
      headers : this.getHeaders({
        pageType : `reese84Create`,
        url : this.reese84Url,
        referer,
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
      headers : this.getHeaders({
        pageType : `iframe`,
        url,
        referer : `${new URL(url).origin}`,
      }),
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
      headers : this.getHeaders({
        pageType : `captcha`,
        url,
        referer : `${new URL(url).origin}`
      }),
      agent : this.agent,
      method : `POST`,
      body : `g-recaptcha-response=${gCaptchaToken}`
    });

    const submitCaptchaPageBody = await submitCaptchaPage.text();

    /*
    if(submitCaptchaPage.status !== 200){
      throw new IncapsulaError(`Incapsula did not return a 200 error. It returned:${submitCaptchaPage.status}. Body:${submitCaptchaPageBody}`);
    }
    */
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
    const referer = options.referer;

    switch(pageType){
      case `main`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Connection' : `keep-alive`,
          'Upgrade-Insecure-Requests' : `1`,
          'Sec-Fetch-Dest' : `document`,
          'Sec-Fetch-Mode' : `navigate`,
          'Sec-Fetch-Site' : `none`,
          'Sec-Fetch-User' : `?1`
        };
      case `refresh`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Upgrade-Insecure-Requests' : `1`,
          'Sec-Fetch-Dest' : `document`,
          'Sec-Fetch-Mode' : `navigate`,
          'Sec-Fetch-Site' : `cross-site`,
          'Pragma' : `no-cache`,
          'Cache-Control' : `no-cache`,
        };
      case `utmvc-image`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `image/avif,image/webp,*/*`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Sec-Fetch-Dest' : `image`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case `utmvc`:
      case `reese84`:
      case `captcha`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `*/*`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Sec-Fetch-Dest' : `script`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case `reese84Create`:
      case `reese84Update`:
        return {
          'Host' : new URL(url).host,
          'Connection' : `keep-alive`,
          'Accept' : `application/json; charset=utf-8`,
          'Content-Type' : `text/plain; charset=utf-8`,
          'User-Agent' : this.userAgent,
          'Origin' : new URL(url).origin,
          'Sec-Fetch-Site' : `same-origin`,
          'Sec-Fetch-Mode' : `cors`,
          'Sec-Fetch-Dest' : `empty`,
          'Referer' : referer,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Cookie' : ``,
        };

      case `favicon`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `image/avif,image/webp,*/*`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Sec-Fetch-Dest' : `image`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case `iframe`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Upgrade-Insecure-Requests' : `1`,
          'Sec-Fetch-Dest' : `iframe`,
          'Sec-Fetch-Mode' : `navigate`,
          'Sec-Fetch-Site' : `same-origin`,
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
