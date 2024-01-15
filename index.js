const { google } = require("googleapis");
const CLIENT_ID =
  "124470260828-nfg0jgh02pvg2rsb5c6r3movochnd6ed.apps.googleusercontent.com";
const CLEINT_SECRET = "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";
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN =
  "1//04gY2ttMME6eDCgYIARAAGAQSNwF-L9IrjtVmTh_PE_uyOlBaY9HuSgfXZz0bouzoaavoJcAYG_Njsm80GRTPbAIMQ9CM62hAS7s";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLEINT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const UserReplied = new Set();

//Searching for new emails and response back.
async function validatingEmailsAndResponseBack() {
  try {
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    // Get the list of unread messages.
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
    });
    const messages = res.data.messages;

    if (messages && messages.length > 0) {
      // Fetch the complete message details.
      for (const message of messages) {
        const email = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
        });

        const from = email.data.payload.headers.find(
          (header) => header.name === "From"
        );
        const header = email.data.payload.headers.find(
          (header) => header.name === "To"
        );
        const Subject = email.data.payload.headers.find(
          (header) => header.name === "Subject"
        );

        const From = from.value;

        const toEmail = header.value;

        const subject = Subject.value;
        console.log("email come From", From);
        console.log("to Email", toEmail);

        if (UserReplied.has(From)) {
          console.log("Already replied to : ", From);
          continue;
        }

        const thread = await gmail.users.threads.get({
          userId: "me",
          id: message.threadId,
        });

        const replies = thread.data.messages.slice(1);

        if (replies.length === 0) {
          await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: await createReplyRaw(toEmail, From, subject),
            },
          });

          // Add a label to the email.
          const labelName = "Not Available";
          await gmail.users.messages.modify({
            userId: "me",
            id: message.id,
            requestBody: {
              addLabelIds: [await createLabelIfNeeded(labelName)],
            },
          });

          console.log("Sent reply to email:", From);
          UserReplied.add(From);
        }
      }
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

async function createReplyRaw(from, to, subject) {
  const emailContent = `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\
  Thanks for your message! I'm not available right now, but I'll get back to you soon.`;
  const base64EncodedEmail = Buffer.from(emailContent)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return base64EncodedEmail;
}

async function createLabelIfNeeded(labelName) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const res = await gmail.users.labels.list({ userId: "me" });
  const labels = res.data.labels;

  const existingLabel = labels.find((label) => label.name === labelName);
  if (existingLabel) {
    return existingLabel.id;
  }

  const newLabel = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });

  return newLabel.data.id;
}

function RandomTimeInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

setInterval(validatingEmailsAndResponseBack, RandomTimeInterval(45, 120) * 1000);
