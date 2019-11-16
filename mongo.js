// 1 - Import de puppeteer
const puppeteer = require('puppeteer')
const mongoose = require('mongoose');
const User = require('./models/user');

const gitHub = async () => {

  const browser = await puppeteer.launch({headless:false, slowMo: 100});   
  const page = await browser.newPage();  

  await page.goto('https://github.com/login', {waitUntil: 'networkidle2'}); 

  const USERNAME_SELECTOR = '#login_field';
  const PASSWORD_SELECTOR = '#password';
  const BUTTON_SELECTOR = '#login > form > div.auth-form-body.mt-3 > input.btn.btn-primary.btn-block';


  const CREDS = require('./creds');

  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type(CREDS.username);

  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type(CREDS.password);

  await page.click(BUTTON_SELECTOR);
  // await page.waitForNavigation();
  const userToSearch = 'Eric';
  const searchUrl = `https://github.com/search?q=${userToSearch}&type=Users&utf8=%E2%9C%93`;
  await page.goto(searchUrl);
  // await page.waitForNavigation();
   // Get user list
   const userList = 'user-list-item';
   let list = await page.evaluate((sel) => {
     return document.getElementsByClassName(sel).length;
   }, userList);
   const listUsername = '#user_search_results > div.user-list > div:nth-child(id) div.d-flex > div > a';
   const listEmail = '#user_search_results > div.user-list > div:nth-child(id) > div.flex-auto > div.d-flex.flex-wrap.text-small.text-gray > div:nth-child(2) > a';
 
   async function getPages(page) {
     const numUser = '#js-pjax-container > div > div.col-12.col-md-9.float-left.px-2.pt-3.pt-md-0.codesearch-results > div > div.d-flex.flex-column.flex-md-row.flex-justify-between.border-bottom.pb-3.position-relative > h3';
 
     let inner = await page.evaluate((sel) => {
       let html = document.querySelector(sel).innerHTML;
       return html.replace(',', '').replace('users', '').trim();
     }, numUser);
 
     let numUsers = parseInt(inner);
 
     console.log('Users: ', numUsers);
     let numPages = Math.ceil(numUsers / 10);
     return numPages;
 }
 
   let numPages = await getPages(page);
 
   console.log('Pages: ', numPages);
 
   for (let h = 1; h <= numPages; h++) {
 
     let pageUrl = searchUrl + '&p=' + h;
 
     await page.goto(pageUrl);
 
     let list = await page.evaluate((sel) => {
         return document.getElementsByClassName(sel).length;
       }, userList);
 
     for (let i = 1; i <= list; i++) {
       let usernameSelector = listUsername.replace("id", i);
       let emailSelector = listEmail.replace("id", i);
 
       let username = await page.evaluate((sel) => {
           return document.querySelector(sel).getAttribute('href').replace('/', '');
         }, usernameSelector);
 
       let email = await page.evaluate((sel) => {
           let element = document.querySelector(sel);
           return element? element.innerHTML: null;
         }, emailSelector);
 
       if (!email) continue;
 
       console.log(username, ' -> ', email);
 
       // Save to db
       saveUser({
         username: username,
         email: email,
       });
     }
   }
 }
 
 gitHubm()
 
 function saveUser(userObj) {
   const DB_URL = 'mongodb://localhost/git';
   if (mongoose.connection.readyState == 0) { mongoose.connect(DB_URL); }
   let conditions = { email: userObj.email };
   let options = { upsert: true, new: true, setDefaultsOnInsert: true };
   User.findOneAndUpdate(conditions, userObj, options, (err, result) => {
     if (err) throw err;
   });
 }