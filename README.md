# GGMail (Grzegorz Maniak Mail)

GGMail is a highly extendable mail server and client system designed to facilitate the management of domain-specific email addresses. The project aims to streamline the handling of spam by enabling the creation of unique email addresses for various services without the need to create new users each time.

## Why GGMail?

Managing spam becomes challenging when all emails are received in a single inbox. GGMail addresses this issue by allowing users to generate new email addresses for different services, making it easier to isolate and manage spam. By using domain-specific email addresses, users can easily delete an address and create a new one if spam becomes an issue, without having to change their email address for every service they use.

Extending GGMail is also easy, as the server and client are designed to be modular. This allows for the creation of new modules that can be used to extend the functionality of the server and client.

Privacy is also a concern for many users, and GGMail addresses this by allowing users to host their own mail server. This means that users can have full control over their data, and can be sure that their data is not being sold to third parties.

## Requirements

- [Python 3.8](https://www.python.org/downloads/release/python-380/) - Optional, but you will need to implement your own SPF resolver.
    - [pip](https://pip.pypa.io/en/stable/installing/) 
    - [pyspf](https://pypi.org/project/pyspf/) 
    - [dnspython](https://pypi.org/project/dnspython/)
- GMmail is built to run on Bun.js and Node.js, its up to you to decide how you want to run it. 
    - [Bun.js](https://bun.js.org/)
    - [Node.js](https://nodejs.org/en/)

## How does it work?

GGMail operates on a catch-all mechanism, ensuring that all emails sent to the domain are intercepted by the server. This allows for the dynamic creation of email addresses on the go, simplifying the process of generating new addresses for different services without the need to create new users every time.
