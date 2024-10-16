
import JupiterService from "./services/jupiter.service.js"; // Asegúrate de que la ruta sea correcta


/*const getDca = await JupiterService.getDCA(
	"3Vb8yYpkNGziLFB8jp7V9LQUBbMGCS7Hx8E9V184B2pz"
);

console.log("DCA IS :", getDca);*/


/*
const openOrders = await JupiterService.getOpenOrders("HFJEhqTUPKKWvhwVeQS5qjSP373kMUFpNuiqMMyXZ2Gr")

console.log("Limit Order is :", openOrders);
*/

/*
const tradeHistory = await JupiterService.getTradeHistory("HFJEhqTUPKKWvhwVeQS5qjSP373kMUFpNuiqMMyXZ2Gr")


console.log("Trade History is :", tradeHistory);
*/


/*
const orderHistory = await JupiterService.getOrderHistory("HFJEhqTUPKKWvhwVeQS5qjSP373kMUFpNuiqMMyXZ2Gr")

console.log("Order History is :", orderHistory);
*/

// const o = await JupiterService.getOrdersByOwner("HFJEhqTUPKKWvhwVeQS5qjSP373kMUFpNuiqMMyXZ2Gr")

// console.log("resuñados", o);


// await JupiterService.getOrdersByAccount("HFJEhqTUPKKWvhwVeQS5qjSP373kMUFpNuiqMMyXZ2Gr");


// await JupiterService.getAndSaveOrders();

const res = await JupiterService.getJupiterOrders("HFJEhqTUPKKWvhwVeQS5qjSP373kMUFpNuiqMMyXZ2Gr");
console.log("resuñados", res);
