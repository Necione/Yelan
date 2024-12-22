export type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
export type Rank =
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K"
    | "A";

export interface Card {
    rank: Rank;
    suit: Suit;
    value: number;
}

export function createDeck(): Card[] {
    const suits: Suit[] = ["Hearts", "Diamonds", "Clubs", "Spades"];
    const ranks: Rank[] = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
        "A",
    ];
    const deck: Card[] = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            let value: number;
            if (["J", "Q", "K"].includes(rank)) {
                value = 10;
            } else if (rank === "A") {
                value = 11;
            } else {
                value = parseInt(rank);
            }
            deck.push({ rank, suit, value });
        }
    }

    return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
