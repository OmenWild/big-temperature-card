const _btc = "big-temperature-card";
const _btc_url = `https://github.com/OmenWild/${_btc}`;
const _btc_version = "v1.0";


class BigTemperatureCard extends HTMLElement {
    // private properties
    _config = false;
    _state = false;
    _card = false;
    _canvas;
    _cache;

    constructor() {
        super();
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

    fractionToRGB(value, min, max, maxHue = 0, minHue = 240) {
        if (min < 0 && max < 0) {
            // If cold & hot are not set, default to a white background.
            return this.hsl2rgb(0, 1, 1);
        }

        var fraction = 0.0;
        if (value <= min) {
            fraction = 0.0;
        } else if (value >= max) {
            fraction = 1;
        } else {
            fraction = (value - min) / (max - min);
        }

        const hue = fraction * (maxHue - minHue) + minHue;
        return this.hsl2rgb(hue, 1, 0.5);
    }

    getCachedFontSize(text, el) {
        let l = text.toString().length;

        try {
            return this._cache["fontSize"][el.id][l] || 0;
        } catch (e) {
            return 0;
        }
    }

    setCachedFontSize(text, el, fontSize) {
        let l = text.toString().length;
        this._cache["fontSize"][el.id][l] = parseFloat(fontSize).toFixed(0);
        return this.getCachedFontSize(text, el);
    }

    getLargestFontSize(text, el) {
        let cachedFontSize = this.getCachedFontSize(text, el);
        if (cachedFontSize > 0) {
            return cachedFontSize;
        }

        if (el.clientHeight == 0 || el.clientWidth == 0) {
            // Document not parsed/rendered, so punt on calculating the actual font size.
            return "24";
        }

        const context = this._canvas_context;
        const fontWeight = getComputedStyle(el).fontWeight;
        const fontFamily = getComputedStyle(el).fontFamily;

        let fontSize = 0;

        while (fontSize < 8000) {
            fontSize += 1;

            context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

            const fM = context.measureText(text);

            let textWidth = fM.width;
            let textHeight = fM.actualBoundingBoxAscent + fM.actualBoundingBoxDescent;

            if (textWidth >= el.clientWidth || textHeight >= el.clientHeight) {
                if (!this._font_scaling) {
                    el.style.fontSize = `${fontSize}px`;
                    const fS = parseFloat(getComputedStyle(el).fontSize);
                    this._font_scaling = fontSize / fS;
                }
                // console.log(`YYY: ${el.id} fontSize=${fontSize} font_scaling=${this._font_scaling}`);
                return this.setCachedFontSize(text, el, (fontSize - 10) * this._font_scaling);
            }
        }
        // Fallback font size in case the above fails, which should only happen if fontSize >= 8000...
        return "24";
    }

    // log(...args) {
    //     console.log(`${_btc}: `, ...args);
    // }

    setContents(el, state, text = undefined, innerHTML = undefined, round_to = this._config.round_to) {
        if (innerHTML) {
            el.innerHTML = innerHTML;
            text = el.textContent;
        } else {
            if (state) {
                text = parseFloat(state).toFixed(round_to);
            }
            el.textContent = text;
        }

        let maxFontSize = this.getLargestFontSize(text, el);

        // Reduce the font size to give some margin around the edges.
        maxFontSize = parseFloat(maxFontSize * 0.95).toFixed(0);

        el.style.fontSize = `${maxFontSize}px`;
        el.style.lineHeight = `${maxFontSize}px`;

        return text;
    }

    // Whenever the state changes, a new `hass` object is set. Use this to update your content.
    set hass(hass) {
        // Can't assume setConfig is called before hass is set
        if (!this._config) {
            return;
        }

        const config = this._config;

        let state;

        for (const t of ["current", "low", "high"]) {
            if (typeof config[t] === "number") {
                state = config[t];
            } else {
                state = hass.states[config[t]].state;
            }
            if (t === "current") {
                // Only update if the current temp has changed.
                if (state === this._state) {
                    return;
                }

                // Save the current temp for the next time through the loop.
                this._state = state;
            }
            let obj_name = `_${t}`;

            let obj = this[obj_name];
            let value = this.setContents(obj, state);
            if ((t === "current" && config.color_current) || t != "current") {
                this.setBackgroundColor(obj, value, config.cold, config.hot);
            }
        }

        if (config.trend) {
            let measurement = "";

            if (config.show_unit) {
                try {
                    measurement = hass.states[config.current].attributes.unit_of_measurement || "";
                } catch (error) { }
            }

            if (typeof config.trend === "number") {
                state = config.trend;
            } else {
                state = hass.states[config.trend].state;
            }
            let value = parseFloat(state).toFixed(1);
            // let innerHTML = `&nbsp;${value}<span class="faded">${measurement}</span><small>&sol;hr</small>&nbsp;`;
            let innerHTML = `${value}<span class="faded">${measurement}</span><small>&sol;hr</small>`;

            // As a debug area
            // let innerHTML = `${window.devicePixelRatio}:${window.visualViewport.scale}`;

            this.setContents(this._trend, undefined, undefined, innerHTML);
            if (config.color_trend) {
                this.setBackgroundColor(this._trend, value, config.trend_cold, config.trend_hot);
            }

            if (state < 0) {
                this._trend.style.setProperty("text-align", "left");
            } else {
                this._trend.style.setProperty("text-align", "right");
            }
        }
    }

    setBackgroundColor(el, value, min = config.cold, max = config.hot) {
        let rgb = this.fractionToRGB(value, min, max);
        el.style.setProperty("--red", rgb.red);
        el.style.setProperty("--green", rgb.green);
        el.style.setProperty("--blue", rgb.blue);
    }

    wipeCache() {
        this._cache = {
            fontSize: {
                "bwc-low": {},
                "bwc-current": {},
                "bwc-high": {},
                "bwc-trend": {},
            },
        };
        // Wipe the saved state to the display the updates.
        this._state = undefined;
        // Font Scaling should not change with display update, but clear just in-case.
        this._font_scaling = undefined;
    }

    setConfig(config) {
        if (!config.current) {
            throw new Error("Please define a sensor providing the current temperature: current");
        }
        if (!config.low) {
            throw new Error("Please define a sensor providing the low forecast: low");
        }
        if (!config.high) {
            throw new Error("Please define a sensor providing the high forecast: high");
        }

        this._config = {
            current: config.current,
            low: config.low,
            high: config.high,

            cold: parseFloat(config.cold) || 32,
            hot: parseFloat(config.hot) || 100,
            trend: config.trend || 0,

            trend_cold: config.trend_cold || -5,
            trend_hot: config.trend_hot || 5,

            color_current: config.color_current || false,
            color_trend: config.color_trend || false,

            round_to: parseInt(config.round_to) || 0,
            show_unit: config.show_unit || false,

            vertical_height: config.vertical_height || "",
        };

        if (!this.setupComplete) {
            const card = document.createElement("ha-card");

            const container = document.createElement("div");
            container.id = "container";
            container.className = "bwc-grid-container";

            const low = document.createElement("div");
            low.id = "bwc-low";
            low.className = "grid-item bwc-low bwc-background-color";
            container.appendChild(low);

            const current = document.createElement("div");
            current.id = "bwc-current";
            current.className = "grid-item bwc-current bwc-background-color";
            container.appendChild(current);

            const trend = document.createElement("div");
            trend.id = "bwc-trend";
            trend.className = "grid-item bwc-trend";
            container.appendChild(trend);

            const high = document.createElement("div");
            high.id = "bwc-high";
            high.className = "grid-item bwc-high bwc-background-color";
            container.appendChild(high);

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            this._canvas = canvas;
            this._canvas_context = context;

            const style = document.createElement("style");
            style.textContent = this.getCSS();

            card.appendChild(container);
            card.appendChild(style);

            // TODO: make this work again.
            // card.addEventListener("click", (event) => {
            //     this._fire("hass-more-info", { currentId: config.current });
            // });

            this.append(card);

            this._card = card;
            this._low = low;
            this._current = current;
            this._trend = trend;
            this._high = high;

            this.wipeCache();

            // Set this up here so it is only configured a single time.
            const resizeObserver = new ResizeObserver(
                this.debounce((entry) => {
                    // If the vertical height is defined, and using mason layout, use set value for height.
                    let column_size = parseInt(window.getComputedStyle(this._card).getPropertyValue("--column-size"));
                    if (!column_size && this._config.vertical_height) {
                        card.style.setProperty("--vertical-px", this._config.vertical_height);
                    }
                    // On resize, wipe the caches.
                    this.wipeCache();
                }, 100)
            );

            // Observe the ha-card for size changes so the font size can be recalculated.
            resizeObserver.observe(card);

            this.setupComplete = true;
        }
    }

    debounce(f, delay) {
        let timer = 1000;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => f.apply(this, args), delay);
        };
    }

    getCSS() {
        return `
    ha-card {
        text-align: center;
        color: var(--primary-text-color);
        height: calc(var(--vertical-px, 100%));
        width: 100%;
    }

    .faded {
        opacity: 0.5;
        // color: gray;
    }

    .bwc-low {
        grid-column: 1;
        grid-row: 1 / 3;
        border-right: solid white;
    }

    .bwc-current {
        grid-column: 2;
        grid-row: 1 / 2;
    }

    .bwc-trend {
        grid-column: 2;
        grid-row: 2 / 2;
        border-top: solid white;
    }

    .bwc-high {
        grid-column: 3;
        grid-row: 1 / 3;
        border-left: solid white;
    }

    .bwc-current, .bwc-trend {
        display: flex;
        align-items: center;
        padding-left: 5px;
        padding-right: 5px;
    }

    .bwc-low, .bwc-current, .bwc-high {
        height: auto;
        width: auto;

        justify-content: center;

        font-weight: var(--ha-font-weight-bold);
    }

    .bwc-low, .bwc-high, .bwc-current, .bwc-trend {
        --threshold: 0.5;
        --r: calc(var(--red) * 0.2126);
        --g: calc(var(--green) * 0.7152);
        --b: calc(var(--blue) * 0.0722);
        --sum: calc(var(--r) + var(--g) + var(--b));
        --perceived-lightness: calc(var(--sum) / 255);

        background-color: rgb(var(--red), var(--green), var(--blue));
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

        height: 100%;
        width: 100%;
    }
    `;
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns in masonry view
    static getCardSize() {
        return 2;
    }

    // The rules for sizing your card in the grid in sections view
    getGridOptions() {
        return {
            rows: 4,
            columns: 12,
            min_rows: 2,
        };
    }

    static getConfigElement() {
        return document.createElement(`${_btc}-editor`);
    }

    static getStubConfig() {
        return {
            current: 65.43,
            low: 42,
            high: 82,
            trend: 1.8,
            cold: 32,
            hot: 100,
            trend_cold: -5.0,
            trend_hot: 5.0,
            color_current: true,
            color_trend: true,
            round_to: 0,
            show_unit: true,
            vertical_height: "200px",
        };
    }
}

customElements.define(_btc, BigTemperatureCard);

console.info(
    `%c ${_btc.toUpperCase()} %c ${_btc_version} `,
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray"
);

// Finally we create and register the editor itself
// https://community.home-assistant.io/t/custom-cards-with-gui-editor-as-of-2023/542254
class BigTemperatureCardEditor extends HTMLElement {
    setConfig(config) {
        this.innerHTML = `
            <div style='font-size: calc(var(--ha-font-size-l));'>
                Not yet created &#128577;, PRs welcome. &#128513;
                <br/> Use the Code Editor for card config for now.
                <br/>Docs: <a href="${_btc_url}">${_btc_url}</a></div>
                `;

    }
}

customElements.define(`${_btc}-editor`, BigTemperatureCardEditor);

// // Add to custom card registry
window.customCards = window.customCards || [];
window.customCards.push({
    type: _btc,
    name: "Big Temperature Card",
    preview: true,
    description: "A BIG temperature card for easy visibility across the room.",
    documentationURL: _btc_url,
});
