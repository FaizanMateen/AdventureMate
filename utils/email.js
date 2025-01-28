const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user,ul){
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url=this.url;
    this.form = `Mohammed Faizan Mateen <${process.env.EMAIL_FORM}>`;
  }
  newTransport(){
    if(process.env.NODE_ENV === 'production'){
      // Sendgrid

      return 1
    }
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Send the actual email
  async send(template,subject){
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
       {
          firstName:this.firstName,
          url:this.url,
          subject
       }
    );

    // 2) Define email options
    const mailOptions = {
      from: this.form,
      to: this.to,
      subject,
      html,
      test: htmlToText.fromString(html)
    };

    // 3) Create a transport and send email
  await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome(){
    await this.send('welcome','Welcome to the Natours Family!');
  }
}

