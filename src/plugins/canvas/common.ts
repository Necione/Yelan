import { is, noop } from "@elara-services/utils";
import {
    FontLibrary,
    loadImage,
    type CanvasRenderingContext2D,
} from "skia-canvas";

export function registerFont(name: string) {
    FontLibrary.use(name, `./src/plugins/canvas/fonts/${name}.ttf`);
}

export const fonts = {
    profile: "zh-cn",
    typeRacer: "Nunito",
};

export function width(
    ctx: CanvasRenderingContext2D,
    ...params: (string | number)[]
) {
    let width = 0;
    for (const param of params) {
        width +=
            typeof param === "string" ? ctx.measureText(param).width : param;
    }
    return width;
}

export interface CanvasProfile {
    name: string;
    mora: number | string;
    vault: number | string;
    msgs: number | string;
    rep: number | string;
    pfp: string;
    background: string;
    frame?: string;
    leaderboard: {
        msgs: number | string;
        mora: number | string;
        rep: number | string;
        elo: number | string;
    };
    toggles?: {
        background?: boolean;
        frame?: boolean;
    };
    progress: {
        total: number;
        current: number;
        label: string;
        next: string;
    };
    icons: {
        messages: boolean;
        staff: boolean;
        sage: boolean;
        winner: boolean;
        booster: boolean;
        achievements: boolean;
        cards: boolean;
        contributor: boolean;
    };
}

export function rectangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: { tl: number; tr: number; br: number; bl: number } | number,
    background: string | boolean,
    stroke: boolean,
) {
    return new Promise(async (resolve) => {
        // Check if the background is an image.
        const img = typeof background === "string";

        // Fallback to default values.
        if (typeof stroke === "undefined") {
            stroke = false;
        }
        radius = is.undefined(radius)
            ? {
                  tl: 5,
                  tr: 5,
                  br: 5,
                  bl: 5,
              }
            : is.number(radius)
              ? { tl: radius, tr: radius, br: radius, bl: radius }
              : { tl: 0, tr: 0, br: 0, bl: 0 };

        // Draw the rectangle.
        if (img) {
            ctx.save();
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius.br,
            y + height,
        );
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();

        // Draw the background.
        if (img) {
            ctx.clip();
            const image = await loadImage(background).catch(noop);
            if (image) {
                ctx.drawImage(image, x, y, width, height);
                ctx.restore();
            }
        }

        // Draw the background if it's not an image.
        else if (!img && background) {
            ctx.fill();
        }

        // Stroke the rectangle.
        if (stroke) {
            ctx.stroke();
        }
        resolve(void 0);
    });
}

export function curved(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number | { tl: number; tr: number; br: number; bl: number },
    fill: boolean,
    stroke: boolean,
) {
    if (is.undefined(stroke)) {
        stroke = true;
    }
    if (is.undefined(radius)) {
        radius = 5;
    }
    radius = is.number(radius)
        ? { tl: radius, tr: radius, br: radius, bl: radius }
        : { tl: 0, tr: 0, br: 0, bl: 0 };
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius.br,
        y + height,
    );
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

export function getValue<T extends string>(str: T, splitBy = " | ") {
    return str.split(splitBy);
}

export function loadAllFonts() {
    for (const font of Object.values(fonts)) {
        registerFont(font);
    }
}
