# Sorcerers

Sorcerers is a worms-inspired turn based multiplayer game that runs fully in the browser with a magic theme.\
The game supports both local multiplayer and peer to peer connections between players.\
If you're feeling creative there's a [simple map builder](https://lorgan3.github.io/sorcerers/#/builder) to build and play your own maps, feel free to open an issue/pull request to get it added to the game!

### [Play it here](https://lorgan3.github.io/sorcerers/)

## Running

You need to have Node & Yarn installed. Simply run the following commands to start the game.

```
yarn
yarn dev
```

The server will start on [http://localhost:3000/](http://localhost:3000/)

## Dev

I've developed this with [VS Code](https://code.visualstudio.com/) and the following plugins

- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

Check `package.json`, there are also commands available to run tests and check the types.

## Future

Sorcerers is 'complete' in my opinion but there are some ideas that I might want to tackle in the future:

- Spell selection: It could be cool to have even more spells and the option to pick which ones to use in your game. It was already tricky to make the current selection of spells feel unique and semi balanced though.
- Skins: I do not have the patience or skills to do this myself but I would be happy to collaborate on adding additional skins for the players to the game.
- More map features: Item chests and teleport points come to mind but feel free to suggest your ideas.
- Improved networking and physics: The current implementation gets the job done but this feels like an area that could use some more refinement.

## Credits

See the [ingame credits](https://lorgan3.github.io/sorcerers/#/credits) or [credits.json](credits.json)
