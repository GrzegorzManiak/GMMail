import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Email information
sender_email = 'your_email@example.com'
receiver_email = 'receiver_email@example.com'
subject = 'Test Email from Python'
message = 'This is a test email sent from Python.'

# SMTP server information
smtp_server = 'localhost'
smtp_port = 2525

# Create a multipart message
msg = MIMEMultipart()
msg['From'] = sender_email
msg['To'] = receiver_email
msg['Subject'] = subject

# Attach the message to the email
msg.attach(MIMEText(message, 'plain'))

# Send the email
try:
    server = smtplib.SMTP(smtp_server, smtp_port)
    server.sendmail(sender_email, receiver_email, msg.as_string())
    print("Email sent successfully!")
except Exception as e:
    print(f"Failed to send email. Error: {e}")
finally:
    server.quit()
