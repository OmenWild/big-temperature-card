# Big Temperature Card

A simple card to display big numbers for temperature, designed to be readable from across the room on a wall tablet. It
supports background colors for the daily low & high, and optionally for the current temperature and the trend. These
colors provide an at-a-glance indication of how comfortable today will be.

The font in each area will start small, then auto-resize to fill the maximum amount of space. Because of the way the
maximum font size discovery works, the font size will jump from small to fitted, and will lag when the window if first
loaded or resized.

You can click/tap on each number area to get a standard HASS popup for that sensor.

In this example `54` is the overnight low, `60` is the current temperature, `87` is the daytime high, and `-3.9°F/hr` is
the current temperature trend (custom sensor required).

<img src="https://raw.githubusercontent.com/OmenWild/big-temperature-card/refs/heads/master/example.png" height="182">

## Options

| Name            | Type                 | Required                 | Default | Description                                                                                                                                                                                                     |
| --------------- | -------------------- | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| type            | string               | **Required**             |         | `custom:big-temperature-card`                                                                                                                                                                                   |
| current         | sensor or float      | **Required**             | 65.43   | Sensor to use for the current temperature, e.g. `sensor.my_temperature`                                                                                                                                         |
| low             | sensor or float      | **Required**             | 42      | Sensor to use for the forecast low, e.g. `sensor.temperature_overnight_low`                                                                                                                                     |
| high            | sensor or float      | **Required**             | 82      | Sensor to use for the forecast high, e.g. `sensor.temperature_daytime_high`                                                                                                                                     |
| trend           | sensor or float      | optional                 | 1.8     | The current temperature trend in °/hour, e.g. `sensor.my_temperature_trend`                                                                                                                                     |
| cold            | number               | optional                 | 32      | Your personal preference for "cold". Will be shown as blue.                                                                                                                                                     |
| hot             | number               | optional                 | 100     | Your personal preference for "hot". Will be shown as red.                                                                                                                                                       |
| trend_cold      | number               | optional                 | -5      | Your personal preference for "cold" for the trend. Will be shown as blue.                                                                                                                                       |
| trend_hot       | number               | optional                 | 5       | Your personal preference for "hot" for the trend. Will be shown as red.                                                                                                                                         |
| color_current   | boolean              | optional                 | true    | Color the background of the current temperature field.                                                                                                                                                          |
| color_trend     | boolean              | optional                 | true    | Color the background of the temperature trend.                                                                                                                                                                  |
| show_unit       | boolean or string    | optional                 | false   | Show the unit of measurement in the trend field. If a true boolean, then get it from the `current` sensor. If a string, then just show the string (useful for sensors that do not have a `unit_of_measurment`). |
| round_to        | int                  | optional                 | 0       | Number of decimals to round the current temperature to.                                                                                                                                                         |
| vertical_height | HTML unit of measure | Required<br/>for Masonry | 200px   | Height of the card in Masonry.                                                                                                                                                                                  |

The four sensors (`current`, `low`, `high`, and `trend`) can be set to floats for testing to find the color settings you
like best, and to see how the auto-scaling works.

The `trend` setting will display a per-hour trend below the current temperature. You have to create this sensor. See
[below for an example](#how-to-create-a-per-hour-temperature-trend).

Note, so far it only supports black text on a white background, though the colors will invert to maintain contrast based
on the background colors. Pull requests welcome to make it more flexible.

## Example

### Sections

```yaml
type: custom:big-temperature-card
current: sensor.backyard_temperature_smoothed
low: sensor.pirate_weather_overnight_low_temperature_0d
high: sensor.pirate_weather_daytime_high_temperature_0d
trend: sensor.backyard_temperature_trend_change
cold: 32
hot: 100
trend_cold: -5
trend_hot: 5
color_current: true
color_trend: true
round_to: 0
show_unit: true
```

### Masonry

Same as `Sections`, but you have to manually specify the height in a CSS unit (`px`, `em`, etc.).

```yaml
vertical_height: 200px
```

## How to create a per hour temperature trend

```yaml
- platform: statistics
  unique_id: "01972f06-7f78-77ca-9a0b-26f4223d428c"
  name: "Backyard Temperature Trend Change"
  state_characteristic: change
  entity_id: sensor.backyard_temperature_smoothed
  precision: 1
  sampling_size: 300
  max_age:
      minutes: 60
```

## History

The original version was based on [Bignum card](https://github.com/custom-cards/bignumber-card/), this version has been
re-written from scratch.
