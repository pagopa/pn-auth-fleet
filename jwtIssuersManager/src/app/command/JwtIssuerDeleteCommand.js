class JwtIssuerDeleteCommand {
    constructor(jwtIssuersRepository) {
        this.jwtIssuersRepository = jwtIssuersRepository;
    }

    async execute(id) {
        return this.jwtIssuersRepository.delete(id);
    }
}

module.exports = JwtIssuerDeleteCommand;