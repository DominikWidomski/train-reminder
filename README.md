# Train Reminder
Simple Google Chrome extension that would suggest to me when a good time to leave the office would be, based on train arrival times, the routes and my location.

## Milestones

* Basic functionality, getting right data to provide journey suggestion
    * remember that sometimes journey suggestions show journeys starting in the past, check that out, adjust for that
    * cache and log journey data? Show latest journey you loaded, not the DEV JSON FALLBACK in case I can't get new journey data.
* Visuals (style, views, animations, etc.)
* When the code fires (retrieving journeys, alerts etc)
* Additional functionality:
    * Allow 'leaving-buffer', i.e. time to buffer out when to leave, like when you know it takes you extra time to leave the building
    * chrome.alarms and notifications to remind user to leave, specify windows of when to remind user to leave, those can be snoozed etc.
* Improve JS templating, MVC
* What can I test?
* Build process (JS modules, compile SCSS, JS templating, create correct HTML files etc)

## Contributing

If you feel like this is something you'd find useful yourself and would like to help me figure it out, [Create a new issue](https://github.com/DominikWidomski/train-reminder/issues/new) on GitHub, be it for improvements or bugs.
