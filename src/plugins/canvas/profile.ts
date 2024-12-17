/* eslint-disable no-async-promise-executor */
import { formatNumber, noop } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import { Canvas, loadImage, type CanvasRenderingContext2D } from "skia-canvas";
import { images } from "../../utils/images";
import {
    curved,
    fonts,
    getValue,
    rectangle,
    width,
    type CanvasProfile,
} from "./common";

const draw = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    image: string,
) =>
    new Promise(async (resolve) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height,
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();
        const img = await loadImage(image).catch(noop);
        if (img) {
            ctx.drawImage(img, x, y, width, height);
        }
        ctx.restore();
        resolve(ctx);
    });

// For this only use the raw.githubusercontent.com domain, the redirect isn't needed since this isn't being displayed to the user.
const icon = (path: string, ext = "png") =>
    `https://raw.githubusercontent.com/LiyueHarbor/cdn/main/profiles/icons/${path}.${ext}` as const;

/**
 * A function to create the canvas image, convert to command class.
 */
export async function createProfile(user: CanvasProfile) {
    const lb = user.leaderboard;
    const canvas = new Canvas(1680, 800);
    canvas.gpu = false;
    const ctx = canvas.getContext(`2d`);

    // Draw background.`
    if (user.toggles?.background !== true) {
        await draw(ctx, 0, 0, canvas.width, canvas.height, 25, user.background);
    }

    // Write username.
    ctx.font = `80px "${fonts.profile}"`;
    ctx.shadowColor = `#000`;
    ctx.shadowBlur = 15;
    ctx.fillStyle = `#fefefe`;
    ctx.fillText(user.name, 80, 130);

    // Main cell background.
    ctx.globalAlpha = 0.15;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `#000`;
    curved(
        ctx,
        60,
        170,
        canvas.width - 120,
        canvas.height - 380,
        20,
        true,
        false,
    );

    // Draw user pfp.
    ctx.globalAlpha = 1;

    ctx.save();
    // ctx.beginPath();
    // ctx.arc(canvas.width - 550 + 180, 260, 180, 0, Math.PI * 2, true);
    // ctx.closePath();
    // ctx.clip();
    await draw(ctx, canvas.width - 550, 80, 360, 360, 0, user.pfp);
    // ctx.drawImage(image, 35, 50, 200, 200)
    ctx.restore();
    if (user.toggles?.frame !== true) {
        // draw user pfp border
        await draw(
            ctx,
            canvas.width - 590,
            40,
            430,
            430,
            0,
            user.frame || images.commands.profile.frame,
        );
    }

    const getWidth = (add: number, thing: number | string) => {
        return add + ctx.measureText(thing.toLocaleString()).width;
    };

    const [mora, moratext] = getValue(
        `${formatNumber(user.mora)} | ${texts.c.u}`,
    );
    const [msgs, msgstext] = getValue(`${formatNumber(user.msgs)} | Messages`);
    const [rep, reptext] = getValue(`${formatNumber(user.rep)} | Reputation`);

    // Write user stats.
    // Count for the user
    ctx.fillStyle = "#FF8637";
    ctx.font = `65px "${fonts.profile}"`;
    ctx.fillText(mora, 110, 280);
    ctx.fillText(msgs, 110, 360);
    ctx.fillText(rep, 110, 440);

    // Text for the name of the count
    ctx.fillStyle = "#fefefe";
    ctx.font = `60px "${fonts.profile}"`;
    ctx.fillText(moratext, getWidth(140, mora), 280);
    ctx.fillText(msgstext, getWidth(140, msgs), 360);
    ctx.fillText(reptext, getWidth(135, rep), 440);

    // Leaderboard
    ctx.fillStyle = "#c0c0c0";
    ctx.font = `60px "${fonts.profile}"`;
    ctx.fillText(
        `(#${formatNumber(lb.mora)})`,
        getWidth(140, `${mora} ${moratext}`),
        280,
    );
    ctx.fillText(
        `(#${formatNumber(lb.msgs)})`,
        getWidth(140, `${msgs} ${msgstext}`),
        360,
    );
    ctx.fillText(
        `(#${formatNumber(lb.rep)})`,
        getWidth(135, `${rep} ${reptext}`),
        440,
    );

    // Sub cell background.
    // ctx.globalAlpha = 0.2;
    // ctx.shadowBlur = 10;
    // ctx.fillStyle = `#000`;
    // curved(ctx, 60, 620, canvas.width - 120, 120, 20, true, false);

    // Draw the user badges.
    ctx.fillStyle = user.icons.messages ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(130, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.messages) {
        await rectangle(ctx, 95, 460, 75, 75, 0, icon("messages"), false);
    }

    ctx.fillStyle = user.icons.staff ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(220, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.staff) {
        await rectangle(ctx, 185, 460, 75, 75, 0, icon("staff"), false);
    }

    ctx.fillStyle = user.icons.sage ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(310, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.sage) {
        await rectangle(ctx, 275, 460, 75, 75, 0, icon("sage"), false);
    }

    ctx.fillStyle = user.icons.winner ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(400, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.winner) {
        await rectangle(ctx, 365, 460, 75, 75, 0, icon("winner"), false);
    }

    ctx.fillStyle = user.icons.booster ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(490, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.booster) {
        await rectangle(ctx, 455, 460, 75, 75, 0, icon("booster"), false);
    }

    ctx.fillStyle = user.icons.achievements ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(580, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.achievements) {
        await rectangle(ctx, 545, 460, 75, 75, 0, icon("achievements"), false);
    }

    ctx.fillStyle = user.icons.cards ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(670, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.cards) {
        await rectangle(ctx, 635, 460, 75, 75, 0, icon("cards"), false);
    }

    ctx.fillStyle = user.icons.contributor ? "#fefefe" : "#c0c0c0";
    ctx.beginPath();
    ctx.arc(760, 515, 20, 0, Math.PI * 2);
    ctx.fill();
    if (user.icons.contributor) {
        await rectangle(ctx, 725, 460, 75, 75, 0, icon("contributor"), false);
    }

    // Draw progress bar on the sub cell.
    ctx.fillStyle = "#fefefe";
    await rectangle(ctx, 60, 615, canvas.width - 120, 80, 15, true, false);
    ctx.fillStyle = "#ffd966";
    const l =
        (user.progress.current * (canvas.width - 120)) / user.progress.total;
    await rectangle(ctx, 60, 615, l < 20 ? 20 : l, 80, 15, true, false);

    // Write the progress bar text.
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#fefefe";
    ctx.font = '45px "zh-cn"';
    ctx.fillText(
        `${user.progress.current}/${user.progress.total} EXP`,
        110,
        670,
    );

    // Write level labels.
    ctx.font = '40px "zh-cn"';
    ctx.fillText(user.progress.label, 90, 750);
    ctx.fillText(
        user.progress.next,
        canvas.width - width(ctx, user.progress.next, 90),
        750,
    );

    return canvas.toBuffer("png");
}
