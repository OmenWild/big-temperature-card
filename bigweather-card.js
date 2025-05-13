class BigWeatherCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    setConfig(config) {
        if (!config.current) {
            throw new Error("Please define: current");
        }
        if (!config.low) {
            throw new Error("Please define: low");
        }
        if (!config.high) {
            throw new Error("Please define: high");
        }

        const root = this.shadowRoot;
        if (root.lastChild) root.removeChild(root.lastChild);

        const cardConfig = Object.assign({}, config);

        if (!cardConfig.scale) cardConfig.scale = "150px";
        if (!cardConfig.opacity) cardConfig.opacity = "0.5";

        cardConfig.cold = parseFloat(config.cold) || -1;
        cardConfig.hot = parseFloat(config.hot) || -1;

        cardConfig.round = parseFloat(config.round) || 0;

        cardConfig.showunit = config.showunit || false;

        const card = document.createElement("ha-card");
        const container = document.createElement("span");
        container.id = "container";
        container.className = "bwc-grid-container";

        const low = document.createElement("span");
        low.id = "bwc-low";
        low.className = "grid-item bwc-low";
        container.appendChild(low);

        const current = document.createElement("span");
        current.id = "bwc-current";
        current.className = "grid-item bwc-current";
        container.appendChild(current);

        const trend = document.createElement("span");
        trend.id = "bwc-trend";
        trend.className = "grid-item bwc-trend";
        container.appendChild(trend);

        const high = document.createElement("span");
        high.id = "bwc-high";
        high.className = "grid-item bwc-high";
        container.appendChild(high);

        const style = document.createElement("style");

        style.textContent = `
      ha-card {
        text-align: center;
        --base-unit: ${cardConfig.scale};
        color: var(--primary-text-color);
      }

      .bwc-current small{
        opacity: ${cardConfig.opacity};
        font-size: calc(var(--base-unit) * 0.33);
      }

      .bwc-low {
        grid-column: 1;

        padding-left: 5px;
        //text-align: left;
      }

      .bwc-trend {
        grid-column: 2;

        font-size: calc(var(--base-unit) * 0.2);

        margin-top: -0.35em;
        padding-left: calc(var(--base-unit) * 0.05);
        padding-right: calc(var(--base-unit) * 0.05);
      }

      .bwc-current {
        grid-column: 2;

        font-weight: bold;
        font-size: calc(var(--base-unit) * 0.8);

        margin-top: -0.35em;
      }

      .bwc-high {
        grid-column: 3;

        padding-right: 5px;
        // text-align: right;
      }

      .bwc-low, .bwc-high {
        padding-top: 0.25em;
        grid-row: 1 / 3;

        font-size: calc(var(--base-unit) * 0.5);
        font-weight: bolder;

        --threshold: 0.5;

        background-color: rgb(var(--red), var(--green), var(--blue));

        --r: calc(var(--red) * 0.2126);
        --g: calc(var(--green) * 0.7152);
        --b: calc(var(--blue) * 0.0722);
        --sum: calc(var(--r) + var(--g) + var(--b));
        --perceived-lightness: calc(var(--sum) / 255);

        /*
           https://css-tricks.com/switch-font-color-for-different-backgrounds-with-css/
           shows either white or black color depending on perceived darkness
        */
        color: hsl(0, 0%, calc((var(--perceived-lightness) - var(--threshold)) * -10000000%));
      }

      .bwc-grid-container {
        display: grid;
        grid-template-columns: 25% 50% 25%;
        grid-template-rows: 80% 20%;
        height: calc(var(--base-unit));
      }
        `;

        card.appendChild(container);
        card.appendChild(style);
        card.addEventListener("click", (event) => {
            this._fire("hass-more-info", { currentId: config.current });
        });
        root.appendChild(card);
        this._config = cardConfig;
    }

    _fire(type, detail, options) {
        const node = this.shadowRoot;
        options = options || {};
        detail = detail === null || detail === undefined ? {} : detail;
        const event = new Event(type, {
            bubbles: options.bubbles === undefined ? true : options.bubbles,
            cancelable: Boolean(options.cancelable),
            composed: options.composed === undefined ? true : options.composed,
        });
        event.detail = detail;
        node.dispatchEvent(event);
        return event;
    }

    hsl2rgb(h, s, l) {
        // Originally based on https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
        let a = s * Math.min(l, 1 - l);
        let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

        // Clamp number between two values
        // https://www.webtips.dev/webtips/javascript/how-to-clamp-numbers-in-javascript
        const clamp = (num) => Math.min(Math.max(num * 255, 0), 255);

        return {
            red: clamp(f(0)),
            green: clamp(f(8)),
            blue: clamp(f(4)),
        };
    }

    fractionToRGB(config, value, maxHue = 0, minHue = 240) {
        if (config.cold < 0 && config.hot < 0) {
            // If cold & hot are not set, default to a white background.
            return this.hsl2rgb(0, 1, 1);
        }

        var fraction = 0.0;
        if (value <= config.cold) {
            fraction = 0.0;
        } else if (value >= config.hot) {
            fraction = 1;
        } else {
            fraction = (value - config.cold) / (config.hot - config.cold);
        }

        const hue = fraction * (maxHue - minHue) + minHue;
        return this.hsl2rgb(hue, 1, 0.5);
    }

    set hass(hass) {
        const config = this._config;
        const root = this.shadowRoot;

        let state = hass.states[config.current].state;

        if (state !== this._state) {
            const measurement = hass.states[config.current].attributes.unit_of_measurement || "";
            this._state = state;

            let value = parseFloat(state).toFixed(config.round);

            if (config.showunit == true) {
                root.getElementById("bwc-current").innerHTML = `${value}<small>${measurement}</small>`;
            } else {
                root.getElementById("bwc-current").textContent = `${value}`;
            }

            if (config.trend) {
                state = hass.states[config.trend].state;
                value = parseFloat(state).toFixed(1);
                root.getElementById("bwc-trend").innerHTML = `${value}°<small>/hr</small>`;
                if (state < 0) {
                    root.getElementById("bwc-trend").style.setProperty("text-align", "left");
                } else {
                    root.getElementById("bwc-trend").style.setProperty("text-align", "right");
                }
            }

            state = hass.states[config.low].state;
            value = parseFloat(state).toFixed(0);
            root.getElementById("bwc-low").textContent = `${value}`;

            let rgb = this.fractionToRGB(config, value);
            root.querySelector(".bwc-low").style.setProperty("--red", rgb.red);
            root.querySelector(".bwc-low").style.setProperty("--green", rgb.green);
            root.querySelector(".bwc-low").style.setProperty("--blue", rgb.blue);

            state = hass.states[config.high].state;
            value = parseFloat(state).toFixed(0);
            root.getElementById("bwc-high").textContent = `${value}`;

            rgb = this.fractionToRGB(config, value);
            root.querySelector(".bwc-high").style.setProperty("--red", rgb.red);
            root.querySelector(".bwc-high").style.setProperty("--green", rgb.green);
            root.querySelector(".bwc-high").style.setProperty("--blue", rgb.blue);

            // if (config.trend) {
            //   state = hass.states[config.trend].state;
            //   value = parseFloat(state).toFixed(1);
            //   if (value < 0) {
            //     root.getElementById("bwc-low").innerHTML += `<br/> <small>${value}°/hr</small>`;
            //   } else {
            //     root.getElementById("bwc-high").innerHTML += `<br/> <small>${value}°/hr</small>`;
            //   }
            // }
        }
        root.lastChild.hass = hass;
    }

  getCardSize() {
    return 1;
  }
}

customElements.define("bigweather-card", BigWeatherCard);

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "bigweather-card",
  name: "Big Weather card",
  preview: false,
  description: "A simple card to display big numbers for Weather. It also supports severity levels as background.",
});
