# imap-to-discord

Forward mails in an IMAP mailbox to a discord webhook.

## Configuration

imap-to-discord is configured using JSONC files. You can either use a single `appsettings.jsonc` file or a directory called `appsettings` with multiple `.jsonc` files in them. If multiple files are used their keys are deep merged, with filenames later in the alphabet having priority. 
All examples below will use the directory format, placing each step in its own file.

### Adding your IMAP server

First you need to configure server(s) to receive mails from.

```jsonc
// appsettings/01-imap-servers
{
  "ImapServers": {
    "your-server-1": {
      "Server": {
        "host": "imap.example.com",
        "port": 993,
        "secure": true,
        "auth": {
          "user": "jane.doe@example.com",
          "pass": "changeit"
        }
      }
    }
  }
}
```

Every server supports the following configuration options:

* `Flag` - The message flag to add to a message once processed. (Default: `\\Seen` - marks the message as read. Most IMAP servers support arbitrary values here.)
* `Mailbox` - The mailbox to search for messages in. (Default: `INBOX`)
* `Cache` - Should imap-to-discord also cache data locally or only rely on data sent by the IMAP server between restarts? (Default: `true`)
* `Server` - Settings for the IMAP server. See the `options` on [this page](https://imapflow.com/module-imapflow-ImapFlow.html) for documentation. (Required)

### Forwarding the mails to discord

Now that we receive the mails from the IMAP server we need to forward them to discord.

```jsonc
// appsettings/02-basic-forward.jsonc
{
  "Forward": {
    "your-forward-1": {
      "Webhook": "https://discord.com/api/webhooks/45646468789789701/UikfdfScOv-0pAsdfgsfae34rt_asdgbniFEas232hrebz54v3425_dsDsf"
    }
  }
}
```

This is the most basic forward settings available and will simply forward all mails received from any mail server to Discord using a very simple formatter.

Every forward supports the following options:

* `Server` - A detector to limit which IMAP servers forwarded. (Default: `All`)
* `Mails` - A detector to limit which mails will be forwarded. (Default: `All`)
* `Formatter` - The formatter to format the mails for discord. (Default: `Default`)
* `Exclusive` - Abort the handling of this mail after this formatter, blocking others from also forwarding it? (Default: `true`)
* `Webhook` - The webhook URL to send the message to. (Required)

Many cases will however require most advanced handling for mails than the bare bones configuration above. In this case we can use the `Server`, `Mails` and `Formatter` config options of the forward to configure it further.

### Limiting the server

The `Server` configuration allows us to limit which IMAP servers will even be considered by this forward using a detector.

```jsonc
// appsettings/03-server-detector.jsonc
{
  "Forward": {
    "your-forward-1": {
      "Server": {
        "Type": "Named",
        "Name": "your-server-1"
      }
    }
  }
}
```

This file is merged with the configuration of `appsettings/02-basic-forward.jsonc`, but we also could have placed it in the same file.

This detector limits that the forward `your-forward-1` will only forward mails to the webhook that have been received via the `ImapServer` `your-server-1` which we created in the first step. This can be useful when you have many servers configured.

The following detector types are available:

* `All` - The default detectors, allows everything.
* `Named` - Only allows things with a certain name.
  * `CaseSenstive` - Must the casing match? (Default: `false`)
  * `Name` - The name the thing being detected must have.
* `Custom` - Allows you to write your own detector using JavaScript.
  * `File` - The path to the JavaScript file containing the code.

    An example detector checking if the name of a thing ends with a certain string can look like this:

    ```js
    module.exports = {
      /**
       * Called once when the detector is initialized. Use this for reading configuration or perform other startup related tasks.
       * @param {any} options The configuration of the detector. Access via `this.config(key, default, options)`.
       */
      init(options) {
        this.logger.debug('My detector "init" called!');
        // Instead of "Error" you can also provide a default value if the options is not required.
        this.stringEnding = this.config('EndsWith', Error, options);
      },
      /**
       * A function that checks if the given thing matches this detector.
       * @param {any} value The thing to check.
       * @returns {boolean | Promise<boolean>} Does the thing match the detector?
       */
      detect(value) {
        this.logger.debug('My detector "detect" called!');
        return value.name.endsWith(this.stringEnding);
      },
    }
    ```

    If your detector does not need an `init` function you also also just directly export a function which will then be used as the `detect` function.
    Should you not want to use OOP style programming (`this`) all functions also receive the detector as a second parameter.

## Docker

You can use the following `docker-compose.yml` to run imap-to-discord:

```yml
version: '3.5'

services:
  imaptodiscord:
    container_name: imaptodiscord
    image: sahnee/imaptodiscord:latest
    volumes:
       - ./appsettings:/imaptodiscord/appsettings
    restart: unless-stopped
```

Keep in mind that when using docker only the `appsettings` directory is supported, since the single file already contains docker specific default configuration.
