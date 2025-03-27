export enum MonsterGroup {
    Slime = "Slime",
    Hilichurl = "Hilichurl",
    Abyss = "Abyss",
    Human = "Human",
    Fatui = "Fatui",
    Nobushi = "Nobushi",
    Machine = "Machine",
    Eremite = "Eremite",
    Specter = "Specter",
    Beast = "Beast",
    Wayob = "Wayob",
    Fishing = "Fishing",
    Boss = "Boss",
}

export enum MonsterElement {
    Pyro = "Pyro",
    Hydro = "Hydro",
    Anemo = "Anemo",
    Cryo = "Cryo",
    Electro = "Electro",
    Geo = "Geo",
    Dendro = "Dendro",
    Physical = "Physical",
}

export const elementEmojis: Record<MonsterElement, string> = {
    [MonsterElement.Geo]: "<:Element_Geo:1315186305688276992>",
    [MonsterElement.Hydro]: "<:Element_Hydro:1315186402329235597>",
    [MonsterElement.Electro]: "<:Element_Electro:1315186512895283281>",
    [MonsterElement.Pyro]: "<:Element_Pyro:1315186585020530779>",
    [MonsterElement.Cryo]: "<:Element_Cryo:1315186680784752660>",
    [MonsterElement.Anemo]: "<:Element_Anemo:1315186747713523845>",
    [MonsterElement.Dendro]: "<:Element_Dendro:1315186824892907550>",
    [MonsterElement.Physical]: "",
};
