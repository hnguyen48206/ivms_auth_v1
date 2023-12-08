const axios = require('axios');
var xml2js = require('xml2js');
const SoapClient = require('ang-soap');
const fs = require('fs');

module.exports = {
    async sendSMS(phoneNumber, content) {
        let xml = fs.readFileSync('./domain/authen-utilities/sms_soap.xml', 'utf-8');

        var parser = new xml2js.Parser;
        let result = await parser.parseStringPromise(xml);

        result['soap:Envelope']['soap:Body'][0]['sendSMS'][0].number[0] = phoneNumber;
        result['soap:Envelope']['soap:Body'][0]['sendSMS'][0].message[0] = "noauthen@467342" + content;
        // console.log(result['soap:Envelope']['soap:Body'][0]['sendSMS'])

        var builder = new xml2js.Builder();
        let envelope = builder.buildObject(result);

        // console.log(envelope);
        // URL
        let url = 'https://kv2.vnptit.vn/SMS/wsQLKH.asmx';
        const options = {
            axios: {
                method: 'POST',
                headers: { 'Content-Type': 'text/xml; charset=utf-8', Accept: '*/*', 'SOAPAction': "http://tempuri.org/sendSMS" }
            },
            debug: false,
            isRequestDataXML: true,
        };

        const client = new SoapClient(options);
        client.disableSSL();
        try {
            const res = await client.performRequest(url, envelope);
            console.log('soap', res.Envelope.Body.sendSMSResponse);
            return Promise.resolve(true)
        } catch (error) {
            console.log(error); // See Error section
            return Promise.resolve(false)
        }
    },
    async sendEmail(email, subject, body) {
        try {
            let mailSent = await axios({
                url: 'https://api.sparkpost.com/api/v1/transmissions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'b8656690e94d02cb6b3e976cdb36dcb178001da0'
                },
                data: {
                    "content":
                    {
                        "from": "ivms@lycos.com",
                        "subject": subject,
                        "text": body
                    }
                    , "recipients":
                        [{ "address": email }]
                },
                method: 'POST'
            })
            console.log('Email Sent OK')
            return Promise.resolve(true)

        } catch (error) {
            console.log('Email Sent Fail')
            return Promise.resolve(false)

        }
    }
};