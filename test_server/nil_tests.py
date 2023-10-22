import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Email information
sender_email = 'your_email@example.com'
receiver_email = 'receiver_email@example.com'
cc_email = 'cc_email@example.com'
bcc_email = 'bcc_email@example.com'
subject = 'Test Email from Python'
message = 'This is a test email sent from Python.'

# SMTP server information
smtp_server = 'gmmail.grzegorz.ie'
smtp_port = 2525

# Define multiple email addresses for CC
cc_emails = ['cc_email1@example.com', 'cc_email2@example.com', 'cc_email3@example.com']
bcc_emails = ['bcc_email1@example.com', 'bcc_email2@example.com', 'bcc_email3@example.com']

# Create a multipart message
msg = MIMEMultipart()
msg['From'] = 'John Doe <your_email@example.com>'
msg['To'] = receiver_email

msg['Cc'] = ', '.join(cc_emails)  # Join CC emails with commas
msg['Bcc'] = ', '.join(bcc_emails)  # Join BCC emails with commas

msg['Subject'] = subject

# Attach the message to the email
msg.attach(MIMEText(message, 'plain'))

# Determine whether to use EHLO or regular HELO
use_ehlo = True  # Set this to False to use regular HELO instead

# Send the email using the appropriate protocol
try:
    server = smtplib.SMTP(smtp_server, smtp_port)

    # -- Custom command
    rt =  server.docmd('CUSTOM: SERVER_NAME="Test Server" NEW SERVER_VERSION=5 VALIDATE=true TEST=BOSS')
    print(rt)

    rt =  server.docmd('STARTTLS')
    print(rt)

    #server.set_debuglevel(1)  # Set the debug level to 1 to print the SMTP response
    all_recipients = [receiver_email] + cc_emails

    server.sendmail(sender_email, all_recipients, msg.as_string())
    print("Email sent successfully!")
except Exception as e:
    print(f"Failed to send email. Error: {e}")
finally:
    server.quit()
