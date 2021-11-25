const { CaptchaHarvester } = require('recaptcha-harvester');

(async () => {
    // Initialize the harvester with the recaptcha site key and url that the recaptcha is located at.
    let harvester = new CaptchaHarvester('6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz', 'https://www.supremenewyork.com/checkout');
    // Starting the harvester will open a google login page and save cookies if it hasn't been done previously.
    // Returns an ID to reference the harvester page when harvesting and trying to get the token.
    let harvester_id = await harvester.start_captcha_harvester();
    // Start the harvesting process (where the user will solve the challenge).
    await harvester.harvest_captcha_token(harvester_id);
    // This while loop will keep checking until the captcha is solved, and set the resulting object
    let captcha_object = false;
    while(!captcha_object) {
        captcha_object = await harvester.retrieve_captcha_token(harvester_id);
        await harvester.timeout(1000);
    }
    // Log the token that was harvested.
    console.log(captcha_object.token);

})()
