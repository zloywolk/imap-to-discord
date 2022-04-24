# imap-to-discord

Forward mails in an IMAP mailbox or Microsoft Azure to a discord webhook.

## Configuration

imap-to-discord is configured using JSONC files. You can either use a single `appsettings.jsonc` file or a directory called `appsettings` with multiple `.jsonc` files in them. If multiple files are used their keys are deep merged, with filenames later in the alphabet having priority. 
All examples below will use the directory format, placing each step in its own file.

### Adding your server

First you need to configure server(s) (called "Source" in imap-to-discord) to receive mails (called "Message") from. Everything, regardless of if it is a source or messages is a "Thing".

```jsonc
// appsettings/01-sources.jsonc
{
  "Sources": {
    // IMAP
    "your-imap-server-1": {
      // Note the different casing under the "Server" key!
      "Type": "IMAP",
      "Server": {
        "host": "imap.example.com",
        "port": 993,
        "secure": true,
        "auth": {
          "user": "jane.doe@example.com",
          "pass": "8SA@5KndQbU6ib%YQcgh&J2dj&K^P!"
        }
      }
    },
    // Microsoft Azure
    "your-azure-server-1": {
      // Requires you to configure an "App registration" with ONLY the Permission "Mail.Read"
      // Remove any other permissions, especially permissions of type "Delegated".
      "Type": "Graph",
      "TenantId": "b29465d7-9a33-43e6-bc8a-389d60886826",
      "ClientId": "8a257d34-78dc-48a1-b6cf-1a3e99c0bbb9",
      "ClientSecret": "meG^oDPT$obPLg*&tpVqmLMqCD27@$oRkvSozNn@@u@zmd$B",
      "UserId": "jane.doe@example.com" // Or ID of the user / shared mailbox you want to receive mails from
    }
  }
}
```

Every `IMAP` source supports the following configuration options:

* `Server` - Settings for the IMAP server. See the `options` on [this page](https://imapflow.com/module-imapflow-ImapFlow.html) for documentation. (**Required**)
* `Flag` - The message flag to add to a message once processed. (Default: `"\\Seen"` - marks the message as read. Most IMAP servers support arbitrary values here.)
* `Mailbox` - The mailbox to search for messages in. (Default: `"INBOX"`)
* `CacheLocation` - Allows to change the location of the cache stored by this source (or set to `null` to disable caching)? (Default: `"./cache"` - Can also be globally configured at root level for all sources)

Every `Graph` source supports the following configuration options:

* `TenantId` - The directory/tenant ID of your [app registration](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade). (**Required**)
* `ClientId` - The application/client ID of your [app registration](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade). (**Required**)
* `ClientSecret` - A secret stored under "Certificates & secrets". Keep in mind that secrets always have an expiry date and need to be rotated, which is outside of the scope of this software. (**Required**)
* `UserId` - The e-mail address or ID of the (shared) mailbox to search for messages in. (**Required**)
* `Scopes` - The scopes of the application (Default: `["https://graph.microsoft.com/.default"]` - uses the scopes defined in the [enterprise application](https://portal.azure.com/#blade/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/AppAppsPreview)).
* `Mailbox` - The folder of the mailbox to search for messages in (Default: `"Inbox"`)
* `PollingInterval` - As opposed to IMAP imap-to-discord polls Azure for new mails. This is the interval in MS. API requests to the Graph API for mails are free. (Default: `30000` - 30 seconds)
* `MailDeduplication` - Since IDs of mails can change at any time in Azure there are two different strategies available to detect if a mail was already forwarded: `Id` and `Date`. The `Id` strategy uses the ephemeral ID while `Date` uses a naïve approach to simply check the receive date of the mail. (Default: `"Date"`)
* `CacheLocation` - Allows to change the location of the cache stored by this source (or set to `null` to disable caching)? (Default: `./cache` - Can also be globally configured at root level for all sources)

### Forwarding the mails to discord

Now that we receive the mails from a source we need to forward them to discord.

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

* `Webhook` - The webhook URL to send the message to. (**Required**)
* `Source` - A detector to limit which sources are forwarded. (Default: `"All"`)
* `Message` - A detector to limit which messages will be forwarded. (Default: `"All"`)
* `Formatter` - The formatter to format the mails for discord. (Default: `"Default"`)
* `Exclusive` - Abort the handling of this mail after this formatter, blocking others from also forwarding it? (Default: `true`)

Many cases will however require most advanced handling for mails than the bare bones configuration above. In this case we can use the `Source`, `Message` and `Formatter` config options of the forward to configure it further.

### Limiting the source

The `Source` configuration allows us to limit which source will even be considered by this forward using a detector.

```jsonc
// appsettings/03-sources-detector.jsonc
{
  "Forward": {
    "your-forward-1": {
      "Source": {
        "Type": "Named",
        "Name": "your-imap-server-1"
      }
    }
  }
}
```

This file is merged with the configuration of `appsettings/02-basic-forward.jsonc` (created [here](#forwarding-the-mails-to-discord)), but we also could have placed it in the same file.

This detector limits that the forward `your-forward-1` will only forward mails to the webhook that have been received via the IMAP server `your-imap-server-1`, but ignore the Microsoft Azure server which we created in the [first step](#adding-your-server). This can be useful when you have many servers configured.

The following detector types are available:

* `All` - The default detectors, allows everything.
* `Named` - Only allows things with a certain name.
  * `Name` - The name the thing being detected must have. (**Required**)
  * `CaseSenstive` - Must the casing match? (Default: `false`)
* `Regex` - Detects if a certain key matches the specified regex.
  * `Key` - The key to match against. (**Required** - See all available keys [here](#available-keys))
  * `Pattern` - The regex pattern to use for matching. (**Required** - Uses [JS syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) without the slashes)
  * `Flags` - Regex flags to use (Default: `""`)
  * `AllowMissing` - If the key does not exist, should the detector allow the thing? (Default: `false`)
* `Custom` - Allows you to write your own detector using JavaScript.
  * `File` - The path to the JavaScript file containing the code. (**Required**)

    An example detector checking if the name of a thing ends with a certain string can look like this:

    ```js
    module.exports = {
      /**
       * Called once when the detector is initialized. Use this for reading configuration or perform other startup related tasks.
       * @param {object} options The configuration of the detector. Access via `this.config(key, default, options)`.
       * @returns {void | Promise<void>} Once everything has been set up.
       */
      init(options) {
        this.logger.debug('My detector "init" called!');
        // Instead of "Error" you can also provide a default value if the options is not required.
        this.stringEnding = this.config('EndsWith', Error, options);
      },
      /**
       * A function that checks if the given thing matches this detector.
       * @param {Thing} thing The thing to check.
       * @returns {boolean | Promise<boolean>} Does the thing match the detector?
       */
      detect(value) {
        this.logger.debug('My detector "detect" called!');
        return value.get('name').endsWith(this.stringEnding);
      },
    }
    ```

    If your detector does not need an `init` function you also also just directly export a function which will then be used as the `detect` function.
    Should you not want to use OOP style programming (`this`) all functions also receive the detector as a second parameter.

## Docker

You can use the following `docker-compose.yml` to run imap-to-discord (Make sure to replace `<APPSETTINGS_LOCATION>` and `<CACHE_LOCATION>`):

```yml
version: '3.5'

services:
  imaptodiscord:
    container_name: imaptodiscord
    image: sahnee/imaptodiscord:latest
    volumes:
       - <APPSETTINGS_LOCATION>:/imaptodiscord/appsettings
       - <CACHE_LOCATION>:/imaptodiscord/cache
    restart: unless-stopped
```

Keep in mind that when using docker only the `appsettings` directory is supported, since the single file already contains docker specific default configuration.
