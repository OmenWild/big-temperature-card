# Big Weather card 

A simple card to display big numbers for weather, designed to be readable from across the room for a wall tablet. It also supports colors as background for daily low/high.

<img src="example.png" height="150">

Based on [Bignum card](https://github.com/custom-cards/bignumber-card/)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:bigweather-card`
| entity | string | **Required** | `sensor.my_temperature`
| low | string | **Required** | `sensor.temperature_overnight_low`
| high | string | **Required** | `sensor.temperature_daytime_high`
| trend | string | optional | `sensor.my_temperature_trend`
| scale | string | 100px | Base scale for card: '100px'. Note, too large or too small values will destroy the formatting.
| cold | number | optional | Your personal preference for "cold". Will be shown as blue.
| hot | number | optional | Your personal preference for "hot". Will be shown as red.
| showunit | boolean | false | show the unit of measurement if set to true. 
| round | int | 0 | Number of decimals to round the current temperature to.

The `trend` setting will display a per-hour trend below the current temperature. You have to create this sensor. See below for an example.

Note, so far it only supports black text on a white background. Pull requests welcome to make it more flexible.

**Example**

```yaml
type: custom:bigweather-card
current: sensor.backyard_temperature_smoothed
low: sensor.dark_sky_overnight_low_temperature_0d
high: sensor.dark_sky_daytime_high_temperature_0d
trend: sensor.backyard_temperature_trend_change
scale: 150px
showunit: true
cold: 32
hot: 100
```

**How to create a per/hour temperature trend**

```yaml
- platform: statistics
  unique_id: "e948db9c-27aa-4120-83d0-67657594345a"
  name: 'Backyard Temperature Trend Change'
  state_characteristic: change
  entity_id: sensor.backyard_temperature_smoothed
  # entity_id: sensor.backyard_weather_sensor_temperature
  precision: 1
  sampling_size: 300
  max_age:
    minutes: 60
```