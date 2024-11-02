import { type PrefixCommand } from "@elara-services/botbuilder";
import { addButtonRow, error, get, sleep } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import {
    ButtonStyle,
    Colors,
    ComponentType,
    EmbedBuilder,
    type Message,
    type ReadonlyCollection,
    type TextChannel
} from "discord.js";
import { channels } from "../../config";
import { addBalance } from "../../services";
import { binaryCodeMap, morseCodeMap } from "./heistHelpers/codeMap";

const heistState = {
  vaultsStolen: 0,
  maxVaults: 0,
};

const gameState = {
  isActive: false,
  vanguardMoveInProgress: false,
  vanguardMoveHandled: false,
  floor: 1,
};

let originalMap: string[][];
let activeCollectors: any[] = [];

function stopAllCollectors() {
  activeCollectors.forEach((collector) => {
    collector.stop();
  });
  activeCollectors = [];
}

async function handleHeistFailure(
  heistChannel: TextChannel,
  participants: Map<string, string>,
) {
  gameState.isActive = false;
  gameState.vanguardMoveInProgress = false;
  gameState.vanguardMoveHandled = false;
  stopAllCollectors();

  for (const userId of participants.keys()) {
    await heistChannel.permissionOverwrites
      .edit(userId, {
        SendMessages: null,
      })
      .catch((error) =>
        console.error(`Failed to reset permissions for user ${userId}`, error),
      );
  }

  await heistChannel
    .send("The heist has failed... Better luck next time!")
    .catch(() => null);
}

function generateMaps(
  regenerate = false,
  currentGameMap?: string[][],
): string[][] {
  let gameMap: string[][];

  const mapSize = 4 + gameState.floor;

  if (regenerate && currentGameMap) {
    gameMap = currentGameMap.map((row) =>
      row.map((cell) => (cell === "O" ? "-" : cell)),
    );
  } else {
    gameMap = Array.from({ length: mapSize }, () => Array(mapSize).fill("-"));
    gameMap[0][0] = "O";
  }

  gameMap[mapSize - 1][mapSize - 1] = "V";

  const positions = [];
  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      if (gameMap[x][y] === "-") {
        positions.push({ x, y });
      }
    }
  }

  if (gameState.floor < heistState.maxVaults && !regenerate) {
    const randomStairsIndex = Math.floor(Math.random() * positions.length);
    const stairsPosition = positions[randomStairsIndex];
    gameMap[stairsPosition.x][stairsPosition.y] = "S";
    positions.splice(randomStairsIndex, 1);
  }

  const numberOfObstacles = Math.floor(positions.length * 0.5);
  for (let i = 0; i < numberOfObstacles; i++) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    const pos = positions[randomIndex];
    gameMap[pos.x][pos.y] = "X";
    positions.splice(randomIndex, 1);
  }

  let wallCount = gameState.floor + 2;
  while (wallCount > 0 && positions.length > 0) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    const pos = positions[randomIndex];

    const isAdjacentToSpecial = [
      gameMap[pos.x - 1]?.[pos.y],
      gameMap[pos.x + 1]?.[pos.y],
      gameMap[pos.x]?.[pos.y - 1],
      gameMap[pos.x]?.[pos.y + 1],
    ].some((cell) => cell === "V" || cell === "S");

    if (!isAdjacentToSpecial) {
      gameMap[pos.x][pos.y] = " ";
      positions.splice(randomIndex, 1);
      wallCount--;
    }
  }

  if (!regenerate) {
    originalMap = gameMap.map((row) => [...row]);
  }

  return gameMap;
}

function mapToString(map: string[][], floor: number): string {
  let mapString = `Floor: ${floor
    .toString()
    .padStart(2, "0")} of ${heistState.maxVaults
    .toString()
    .padStart(2, "0")}\n\n`;
  mapString += map.map((row) => row.join(" ")).join("\n");
  return mapString;
}

function moveVanguard(
  direction: string,
  gameMap: string[][],
  position: { x: number; y: number },
  heistChannel: TextChannel | undefined,
) {
  if (!heistChannel) {
    error("Error: heistChannel is undefined");
    return;
  }

  if (heistState.vaultsStolen >= heistState.maxVaults) {
    return;
  }

  const mapSize = gameMap.length;

  const prevX = position.x;
  const prevY = position.y;

  switch (direction.toLowerCase()) {
    case "left":
    case "a":
      position.y = Math.max(0, position.y - 1);
      break;
    case "right":
    case "d":
      position.y = Math.min(mapSize - 1, position.y + 1);
      break;
    case "up":
    case "w":
      position.x = Math.max(0, position.x - 1);
      break;
    case "down":
    case "s":
      position.x = Math.min(mapSize - 1, position.x + 1);
      break;
    default:
      error("Invalid move direction");
      return;
  }

  const currentCell = gameMap[position.x][position.y];

  if (gameMap[position.x][position.y] === " ") {
    position.x = prevX; // Revert X position
    position.y = prevY; // Revert Y position
    heistChannel
      .send("You've hit a wall and cannot move in that direction.")
      .catch(() => null);
    return { gameMap, position, currentCell: " " };
  }

  if (currentCell === "S" && heistState.vaultsStolen === gameState.floor) {
    gameState.floor++;
    gameMap = generateMaps();
    originalMap = gameMap.map((row) => [...row]);
    position = { x: 0, y: 0 };
  } else {
    if (prevX !== 0 || prevY !== 0) {
      gameMap[prevX][prevY] = originalMap[prevX][prevY];
    } else {
      gameMap[prevX][prevY] = "-";
    }
  }

  gameMap[position.x][position.y] = "O";

  return { gameMap, position, currentCell };
}

function generateCode(isMorse: boolean) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const codes = [];
  let translation = "";

  for (let i = 0; i < 3; i++) {
    const letter = letters.charAt(Math.floor(Math.random() * letters.length));
    if (isMorse) {
      codes.push(morseCodeMap[letter]);
    } else {
      codes.push(binaryCodeMap[letter]);
    }
    translation += letter;
  }

  const code = isMorse ? codes.join(" / ") : codes.join(" - ");
  return { code, translation };
}

async function handleAttack(
  heistChannel: TextChannel,
  participants: Map<string, string>,
  onComplete: () => Promise<void>,
): Promise<void> {
  const gunnerId = Array.from(participants.entries()).find(
    ([, role]) => role === "Gunner",
  )?.[0];
  if (!gunnerId) {
    await handleHeistFailure(heistChannel, participants);
  }

  const gunnerMention = `<@${gunnerId}>`;
  const randomNumberString = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
  const numberWords = randomNumberString
    .split("")
    .map(
      (num) =>
        [
          "zero",
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
        ][parseInt(num, 10)],
    )
    .join(" ");

  const challengeEmbed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle("Guards in Sight!")
    .setDescription(
      `${gunnerMention}, shoot by saying the following __numbers as words__: \`${randomNumberString}\``,
    );

  await heistChannel.send({ embeds: [challengeEmbed] }).catch(() => null);

  const filter = (m: { author: { id: string }; content: string }) =>
    m.author.id === gunnerId;

  try {
    const collector = heistChannel.createMessageCollector({
      filter,
      max: 1,
      time: get.secs(15),
    });

    activeCollectors.push(collector);

    collector.on("collect", async (collected: Message) => {
      if (collected.content.trim().toLowerCase() === numberWords) {
        await heistChannel
          .send(`${gunnerMention}, you successfully shot the guards!`)
          .catch(() => null);
        await onComplete();
      } else {
        gameState.isActive = false;
        stopAllCollectors();
        await heistChannel
          .send(
            `\`💀\` ${gunnerMention}, you failed to shoot correctly and got shot!`,
          )
          .catch(() => null);
        await onComplete();
        await handleHeistFailure(heistChannel, participants);
      }
    });

    collector.on("end", async (collected: ReadonlyCollection<string, Message<boolean>>) => {
        activeCollectors = activeCollectors.filter((c) => c !== collector);

      if (!collected.size && gameState.isActive) {
        gameState.isActive = false;
        stopAllCollectors();
        await heistChannel
          .send(
            `${gunnerMention}, you failed to respond in time and were killed!`,
          )
          .catch(() => null);
        await handleHeistFailure(heistChannel, participants);
      }

      await onComplete();
    });
  } catch (error) {
    gameState.isActive = false;
    stopAllCollectors();
    await heistChannel
      .send(`${gunnerMention}, you failed to respond in time and were killed!`)
      .catch(() => null);
    await handleHeistFailure(heistChannel, participants);
  }
}

async function handleTrapDisarm(
  heistChannel: TextChannel,
  participants: Map<string, string>,
  onComplete: () => Promise<void>,
): Promise<void> {
  const trapperId = Array.from(participants.entries()).find(
    ([, role]) => role === "Trapper",
  )?.[0];

  if (!trapperId || !gameState.isActive) {
    gameState.isActive = false;
    stopAllCollectors();
    await handleHeistFailure(heistChannel, participants);
    await onComplete();
    return;
  }

  const trapperMention = `<@${trapperId}>`;

  const numbers = Array.from(
    { length: 4 },
    () => Math.floor(Math.random() * 90) + 10,
  );
  const operations = numbers
    .slice(1)
    .map(() => (Math.random() < 0.5 ? "+" : "-"));
  let answer = numbers[0];

  let problemString = `${numbers[0]}`;
  numbers.slice(1).forEach((number, index) => {
    if (operations[index] === "+") {
      answer += number;
    } else {
      answer -= number;
    }
    problemString += ` ${operations[index]} ${number}`;
  });

  const challengeEmbed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle("Trap in Sight!")
    .setDescription(
      `${trapperMention}, disarm the trap by solving this problem:\n\`${problemString}\``,
    );

  await heistChannel.send({ embeds: [challengeEmbed] }).catch(() => null);

  const filter = (m: { author: { id: string }; content: string }) =>
    m.author.id === trapperId && parseInt(m.content.trim()) === answer;

  try {
    const collector = heistChannel.createMessageCollector({
      filter,
      max: 1,
      time: get.secs(15),
    });

    activeCollectors.push(collector);

    collector.on("collect", async (collected: Message) => {
      if (parseInt(collected.content.trim()) === answer) {
        await heistChannel
          .send(`${trapperMention}, you successfully disarmed the trap!`)
          .catch(() => null);
        await onComplete();
      } else {
        gameState.isActive = false;
        stopAllCollectors();
        await heistChannel
          .send(
            `${trapperMention}, you gave the wrong answer and triggered the trap!`,
          )
          .catch(() => null);
        await handleHeistFailure(heistChannel, participants);
        await onComplete();
      }
    });

    collector.on("end", async (collected: ReadonlyCollection<string, Message<boolean>>) => {
        activeCollectors = activeCollectors.filter((c) => c !== collector);

      if (!collected.size && gameState.isActive) {
        gameState.isActive = false;
        stopAllCollectors();
        heistChannel
          .send(`${trapperMention}, you failed to disarm the trap in time!`)
          .catch(() => null);
        await handleHeistFailure(heistChannel, participants);
      }

      await onComplete();
    });
  } catch (error) {
    gameState.isActive = false;
    stopAllCollectors();
    await heistChannel
      .send(`${trapperMention}, you failed to disarm the trap in time!`)
      .catch(() => null);
  }
}

async function handleScoutChallenge(
  heistChannel: TextChannel,
  participants: Map<string, string>,
  onComplete: () => Promise<void>,
): Promise<void> {
  const scoutId = Array.from(participants.entries()).find(
    ([, role]) => role === "Scout",
  )?.[0];

  if (!scoutId || !gameState.isActive) {
    gameState.isActive = false;
    stopAllCollectors();
    await handleHeistFailure(heistChannel, participants);
    return;
  }

  const scoutMention = `<@${scoutId}>`;

  const length = Math.floor(Math.random() * 3) + 3;
  const numbers = Array.from(
    { length },
    () => Math.floor(Math.random() * 100) + 1,
  );

  const shuffledNumbers = numbers.slice().sort(() => Math.random() - 0.5);

  const ascending = Math.random() < 0.5;
  const sortedNumbers = ascending
    ? numbers.sort((a, b) => a - b)
    : numbers.sort((a, b) => b - a);
  const sortedNumbersStringNoCommas = sortedNumbers.join(" ");

  const challengeEmbed = new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle("Cameras from Behind!")
    .setDescription(
      `${scoutMention}, arrange these numbers from\n${
        ascending ? "**smallest to greatest**" : "**greatest to smallest**"
      }: \`${shuffledNumbers.join(", ")}\``,
    );

  await heistChannel.send({ embeds: [challengeEmbed] }).catch(() => null);

  const filter = (m: { author: { id: string }; content: string }) =>
    m.author.id === scoutId;

  try {
    const collector = heistChannel.createMessageCollector({
      filter,
      max: 1,
      time: get.secs(15),
    });

    activeCollectors.push(collector);

    collector.on("collect", async (collected: Message) => {
      if (
        collected.content.trim().replace(/,/g, " ") ===
        sortedNumbersStringNoCommas
      ) {
        await heistChannel
          .send(`${scoutMention}, you successfully removed the camera!`)
          .catch(() => null);
        await onComplete();
      } else {
        gameState.isActive = false;
        stopAllCollectors();
        await heistChannel
          .send(
            `\`💀\` ${scoutMention}, you failed to arrange the numbers correctly and were caught!`,
          )
          .catch(() => null);
        await onComplete();
        await handleHeistFailure(heistChannel, participants);
      }
    });

    collector.on("end", async (collected: ReadonlyCollection<string, Message<boolean>>) => {
        activeCollectors = activeCollectors.filter((c) => c !== collector);

      if (!collected.size && gameState.isActive) {
        gameState.isActive = false;
        stopAllCollectors();
        await heistChannel
          .send(
            `${scoutMention}, you failed to respond in time and were caught!`,
          )
          .catch(() => null);
        await handleHeistFailure(heistChannel, participants);
      }

      await onComplete();
    });
  } catch (error) {
    gameState.isActive = false;
    stopAllCollectors();
    await heistChannel
      .send(`${scoutMention}, you failed to respond on time and got detected!`)
      .catch(() => null);
    await handleHeistFailure(heistChannel, participants);
  }
}

async function handleVaultEncounter(
  heistChannel: TextChannel,
  participants: Map<string, string>,
  heistState: { vaultsStolen: number },
  gameMap: string[][], // pass gameMap as a parameter
  position: { x: number; y: number }, // pass the vanguard's current position
  onComplete: () => Promise<void>,
): Promise<void> {
  const vanguardId = Array.from(participants.entries()).find(
    ([, role]) => role === "Vanguard",
  )?.[0];

  if (!vanguardId || !gameState.isActive) {
    gameState.isActive = false;
    stopAllCollectors();
    return;
  }

  // Check if vault has already been looted
  if (heistState.vaultsStolen >= gameState.floor) {
    await heistChannel
      .send("This vault has already been looted.")
      .catch(() => null);
    onComplete();
    return;
  }

  const isMorse = Math.random() < 0.5;
  const { code, translation } = generateCode(isMorse);
  const vanguardMention = `<@${vanguardId}>`;

  const challengeType = isMorse ? "Morse Code" : "Binary Code";
  const vaultEmbed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle("Vault Found!")
    .setDescription(
      `${vanguardMention}, decipher this ${challengeType} to steal:\n\`${code}\`\n\nSend your response in all caps, no space, one message.`,
    );

  await heistChannel.send({ embeds: [vaultEmbed] }).catch(() => null);

  try {
    const collector = heistChannel.createMessageCollector({
      filter: (m: { author: { id: string }; content: string }) =>
        m.author.id === vanguardId &&
        m.content.trim().toUpperCase() === translation,
      max: 1,
      time: get.secs(15),
    });

    activeCollectors.push(collector);

    collector.on("collect", () => {
      heistChannel
        .send(`${vanguardMention}, you successfully stole from the vault!`)
        .catch(() => null);
      heistState.vaultsStolen++;

      onComplete();
    });

    collector.on("end", async (collected: ReadonlyCollection<string, Message<boolean>>) => {
        activeCollectors = activeCollectors.filter((c) => c !== collector);

      if (!collected.size && gameState.isActive) {
        gameState.isActive = false;
        stopAllCollectors();
        heistChannel
          .send(`${vanguardMention}, you failed to decipher the code in time!`)
          .catch(() => null);
      }

      onComplete();
    });
  } catch (error) {
    gameState.isActive = false;
    stopAllCollectors();
    await heistChannel
      .send(`${vanguardMention}, you failed to respond in time!`)
      .catch(() => null);
    onComplete();
  }
}

export const heist: PrefixCommand = {
    enabled: true,
    name: "heist",
    locked: {
        users: [
            "288450828837322764", // SUPERCHIEFYT
            "476812566530883604", // Kurasad
            "525171507324911637", // Neci
            "664601516220350494", // Hythen
        ],
    },
  execute: async (message, responder) => {
    gameState.isActive = true;
    gameState.vanguardMoveInProgress = false;
    gameState.vanguardMoveHandled = false;
    gameState.floor = 1;

    activeCollectors = [];
    heistState.vaultsStolen = 0;

    const randomNumber = Math.random();
    if (randomNumber <= 0.75) {
      heistState.maxVaults = Math.floor(Math.random() * (5 - 1 + 1)) + 1; // 1-5, 75%
    } else {
      heistState.maxVaults = Math.floor(Math.random() * (8 - 3 + 1)) + 3; // 3-8, 25%
    }

    const totalPrize = heistState.maxVaults * 100 * 4;
    const targetChannel = message.client.channels.resolve(
      channels.heist,
    ) as TextChannel;
    if (!targetChannel || !targetChannel.isTextBased()) {
      return responder.reply("Unable to find the target channel.");
    }

    const warningEmbed = new EmbedBuilder()
      .setTitle("`🚨` Heist Starting Soon")
      .setDescription("Get ready! A heist will start in a few moments.")
      .setColor(Colors.Gold);
    await targetChannel.send({ embeds: [warningEmbed] }).catch(() => null);
    await sleep(get.secs(5));
    const roles = ["Vanguard", "Scout", "Gunner", "Trapper"];

    const participants = new Map<string, string>();

    const embedDescription = () =>
      `Press the button below to join the heist!\n\nTotal Robbale: ${customEmoji.a.z_coins} \`${totalPrize} Coins\`\n\n` +
      `${Array.from(participants.entries())
        .map(([userId, role]) => `<@${userId}> as ${role}`)
        .join("\n")}`;

    const embed = new EmbedBuilder()
      .setTitle("`🚨` A Heist is Starting")
      .setDescription(embedDescription())
      .setColor(Colors.Gold);

    const sentMessage = await targetChannel
      .send({
        embeds: [embed],
        components: [
          addButtonRow({
            id: "join_heist",
            label: "Join Heist",
            style: ButtonStyle.Primary,
          }),
        ],
      })
      .catch(() => null);
    if (!sentMessage) {
      return;
    }

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: get.secs(30),
    });

    collector.on("collect", async (interaction) => {
      if (participants.size >= roles.length) {
        return void interaction
          .reply({
            content: "The heist is already full!",
            ephemeral: true,
          })
          .catch(() => null);
      }

      const userId = interaction.user.id;
      if (participants.has(userId)) {
        return void interaction
          .reply({
            content: "You are already in the heist!",
            ephemeral: true,
          })
          .catch(() => null);
      }

      const availableRoles = roles.filter(
        (role) => ![...participants.values()].includes(role),
      );
      const assignedRole =
        availableRoles[Math.floor(Math.random() * availableRoles.length)];

      participants.set(userId, assignedRole);
      await interaction
        .reply({
          content: `You have joined the heist as a ${assignedRole}!`,
          ephemeral: true,
        })
        .catch(() => null);

      embed.setDescription(embedDescription());
      await sentMessage.edit({ embeds: [embed] }).catch(() => null);
    });

    collector.on("end", async () => {
      if (participants.size === roles.length) {
        await targetChannel
          .send(
            "All roles are filled. Let the Heist Begin!\nPlease head to <#1302379209859141674> to play/spectate!",
          )
          .catch(() => null);

        const heistChannel = (await message.client.channels.fetch(
          "1302379209859141674",
        )) as TextChannel;

        for (const userId of participants.keys()) {
          await heistChannel.permissionOverwrites
            .create(userId, {
              SendMessages: true,
            })
            .catch((error) =>
              console.error(
                `Failed to set permissions for user ${userId}`,
                error,
              ),
            );
        }

        const participantsMention = Array.from(participants.keys())
          .map((userId) => `<@${userId}>`)
          .join(" ");

        await heistChannel
          .send(
            `${participantsMention}\nYou four broke into the Liyue Harbor Bank... good luck!\n\nFulfill your individual duties, the heist will end if one fails. **The game will begin in 20 seconds.**`,
          )
          .catch(() => null);

        setTimeout(async () => {
          let gameMap = generateMaps();
          let position = { x: 0, y: 0 };

          await heistChannel
            .send(
              `Here's the map for the heist:\n\`\`\`${mapToString(
                gameMap,
                gameState.floor,
              )}\`\`\``,
            )
            .catch(() => null);

          const handleVanguardMove = async () => {
            if (
              gameState.vanguardMoveHandled ||
              !gameState.isActive ||
              gameState.vanguardMoveInProgress
            ) {
              return;
            }

            gameState.vanguardMoveInProgress = true;
            gameState.vanguardMoveHandled = true;

            const vanguardId = Array.from(participants.entries()).find(
              ([, role]) => role === "Vanguard",
            )?.[0];
            if (!vanguardId) {
              gameState.isActive = false;
              stopAllCollectors();
              await heistChannel
                .send("No Vanguard present. The heist has failed...")
                .catch(() => null);
              return;
            }

            await heistChannel
              .send(
                `<@${vanguardId}> Choose your next move (Left, Right, Up, Down). You have 10 seconds.`,
              )
              .catch(() => null);

            const moveCollector = heistChannel.createMessageCollector({
              filter: (m) => m.author.id === vanguardId,
              max: 1,
              time: get.secs(10),
            });

            moveCollector.on("collect", async (collected) => {
              const move = collected.content.trim().toLowerCase();
              const validMoves = [
                "left",
                "right",
                "up",
                "down",
                "w",
                "a",
                "s",
                "d",
              ];

              if (validMoves.includes(move)) {
                const result = moveVanguard(
                  move,
                  gameMap,
                  position,
                  heistChannel,
                );

                if (!result) {
                  error("Error: moveVanguard did not return a result.");
                  return;
                }

                gameMap = result.gameMap;
                position = result.position;

                await heistChannel
                  .send(
                    `Current position:\n\`\`\`${mapToString(
                      gameMap,
                      gameState.floor,
                    )}\`\`\``,
                  )
                  .catch(() => null);

                if (result.currentCell === "X") {
                  const challengeFunctions = [
                    handleScoutChallenge,
                    handleTrapDisarm,
                    handleAttack,
                  ];
                  const challengeFunction =
                    challengeFunctions[
                      Math.floor(Math.random() * challengeFunctions.length)
                    ];

                  await challengeFunction(
                    heistChannel,
                    participants,
                    async () => {
                      if (gameState.isActive) {
                        gameState.vanguardMoveInProgress = false;
                        await handleVanguardMove();
                      }
                    },
                  );
                } else if (result.currentCell === "V") {
                  await handleVaultEncounter(
                    heistChannel,
                    participants,
                    heistState,
                    gameMap,
                    position,
                    async () => {
                      if (gameState.isActive) {
                        gameState.vanguardMoveInProgress = false;
                        await handleVanguardMove();
                      }
                    },
                  );
                } else {
                  if (gameState.isActive) {
                    gameState.vanguardMoveInProgress = false;
                    await handleVanguardMove();
                  }
                }
              } else {
                await heistChannel
                  .send("Invalid move. Please choose a valid direction.")
                  .catch(() => null);

                if (gameState.isActive) {
                  gameState.vanguardMoveInProgress = false;
                  await handleVanguardMove();
                }
              }

              gameState.vanguardMoveHandled = false;
            });

            moveCollector.on("end", async (collected, reason) => {
              if (reason === "time" && gameState.isActive) {
                await handleHeistFailure(heistChannel, participants);
              }
            });

            gameState.vanguardMoveHandled = false;
          };

          handleVanguardMove();

          const checkForCompletion = async () => {
            while (
              gameState.isActive &&
              heistState.vaultsStolen < heistState.maxVaults
            ) {
              await sleep(get.secs(1));
            }

            if (
              gameState.isActive &&
              heistState.vaultsStolen >= heistState.maxVaults
            ) {
              const totalCoinsEarned = heistState.vaultsStolen * 100;
              await heistChannel
                .send(
                  `The heist was successful! Total vaults stolen: ${
                    heistState.vaultsStolen
                  }\nTotal coins earned: ${customEmoji.a.z_coins} \`${
                    totalCoinsEarned * 4
                  } Coins\``,
                )
                .catch(() => null);

              for (const [participantId] of participants) {
                await addBalance(participantId, totalCoinsEarned);
              }
            }

            participants.clear();
            gameState.isActive = false;
            stopAllCollectors();
          };

          checkForCompletion();
        }, 20000);
      } else {
        await targetChannel
          .send("The heist couldn't start, not all roles were filled.")
          .catch(() => null);
      }
    });
  },
};