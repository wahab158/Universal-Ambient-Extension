[![Ambient light for YouTube™](assets/heading.png)](#readme)

![Preview](assets/readme/screenshot-1.jpg)


# Ambient light for YouTube™
Immerse yourself in YouTube videos with ambient light!

## Installation
The extension can be installed from the extensions site of your browser once published. Until then, follow the [Development](#development) section to load it unpacked.

## Minimum requirements

### Performance
A video card with a score of at least 1000 points in the PassMark Video Card Benchmark is recommended.
Check your video card's score here:

https://www.videocardbenchmark.net/gpu_list.php

With a score lower than 1000 the extension will still work but it is likely that the YouTube video page will be slow and/or stuttering.
> To troubleshoot performance problems or maximize the performance you can follow the checks and steps in the [Troubleshoot guide](/TROUBLESHOOT.md)


### Browser versions
| Browser  | Version | Reason |
| -------- | ------- | ------ |
| Chromium | 80      | [Optional chaining operator (?.)](https://caniuse.com/mdn-javascript_operators_optional_chaining) |
| Firefox  | 74      | [Optional chaining operator (?.)](https://caniuse.com/mdn-javascript_operators_optional_chaining) |


## Privacy & Security
Read the [privacy policy](/PRIVACY-POLICY.md)


## Report, request or contribute
Feel free to 
- contribute to the project at [Universal-Ambient-Extension](https://github.com/wahab158/Universal-Ambient-Extension)
- report bugs at [Universal-Ambient-Extension/issues](https://github.com/wahab158/Universal-Ambient-Extension/issues)
- request a feature at [Universal-Ambient-Extension/issues](https://github.com/wahab158/Universal-Ambient-Extension/issues)
- or ask a question at [Universal-Ambient-Extension/issues](https://github.com/wahab158/Universal-Ambient-Extension/issues)


## Development
1. Install [Node (LTS)](https://nodejs.org/en/download/)
2. In the terminal/commandline enter `npm install`.
3. In the terminal/commandline enter `npm run build`. A `/dist` folder will be generated which contains all the generated files of the extension.
4. Add the extension to Chrome:
    1. In Chrome go to the url [chrome://extensions/](chrome://extensions/).
    2. Turn on the `Developer mode` toggle.
    3. Click `Load unpacked` and select the `/dist` folder.
    4. `Ambient light for YouTube™` has been added to the list of extensions.
5. After you've modified a file in the `/src` folder follow these steps:
    1. In the terminal/commandline enter `npm run build`
    2. In Chrome go to the url [chrome://extensions/](chrome://extensions/) and click the refresh/update button in the card of the extension.


---

This project is a fork of *YouTube Ambilight* by Wessel Kroos — thanks for the fantastic foundation.
