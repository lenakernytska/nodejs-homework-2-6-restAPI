const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

class CreateSenderSendgrid {
  async send(msg) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    return await sgMail.send({ ...msg, from: "yaapril222@gmail.com" });
  }
}

class CreateSenderNodemailer {
  async send(msg) {
    const options = {
      host: "smtp.meta.ua",
      port: 465,
      secure: true,
      auth: {
        user: "goitnodejs@meta.ua",
        pass: process.env.PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    };

    const transporter = nodemailer.createTransport(options);
    const emailOptions = {
      from: "goitnodejs@meta.ua",
      ...msg,
    };

    return await transporter.sendMail(emailOptions);
  }
}

module.exports = { CreateSenderSendgrid, CreateSenderNodemailer };
