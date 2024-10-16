import PortfolioService from "./services/portfolio.service.js";


const tokens = await PortfolioService.getVerifiedTokensByAddress('HFJEhqTUPKKWvhwVeQS5qjSP373kMUFpNuiqMMyXZ2Gr');

const result = await PortfolioService.generateAnalysisReport(tokens);


