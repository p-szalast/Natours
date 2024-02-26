const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. create a transporter

    // 1a. GMAIL option:
    // const transporter = nodemailer.createTransport({
    //     service: 'Gmail',
    //     auth: {
    //         user: process.env.EMAIL_USERNAME,
    //         pass: process.env.EMAIL_PASSWORD,
    //     },
    // });

    // 1a c.d. If using gmail in private app: activate in gmail "less secure app" option

    // 1b. NON-SUPPORT SERVICES option:
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
        // host: 'sandbox.smtp.mailtrap.io',
        // port: 2525,
        // auth: {
        //     user: '0c4d52525dedf1',
        //     pass: '73f126432616fa',
        // },
    });

    // 2. define email options
    const mailOptions = {
        from: 'Przemyslaw Szalast <pszalast.cg@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: options.html // possible to pass html
    };

    // 3. actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
