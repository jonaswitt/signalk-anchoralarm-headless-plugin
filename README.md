# SignalK Anchor Alarm Plugin (Headless)

[<img src="https://img.shields.io/npm/v/signalk-anchoralarm-headless-plugin">](https://www.npmjs.com/package/signalk-anchoralarm-headless-plugin)

Given the anchor position (`navigation.anchor.position`) and boat position, calculates the current anchor radius (`navigation.anchor.currentRadius`) and bearing (`navigation.anchor.bearingTrue`).

Given the maximum anchor radius (`navigation.anchor.maxRadius`), raises the `notifications.navigation.anchor` notification when the current radius exceeds the maximum radius.

Not to be confused with [signalk-anchoralarm-plugin](https://github.com/sbender9/signalk-anchoralarm-plugin), which operates in a different way. You probably don't want both plugins at the same time.

Designed to work with [signalk-cortex-plugin](https://github.com/jonaswitt/signalk-cortex-plugin) which provides the input for this plugin and [signalk-pushover-plugin](https://github.com/jonaswitt/signalk-pushover-plugin).
