class JwtIssuerUpsertCommand {
  
    constructor(jwtIssuerRepository) {
        this.jwtIssuerRepository = jwtIssuerRepository;
    }
    
    async execute(jwtIssuer) {
        return this.jwtIssuerRepository.upsert(jwtIssuer);
    }
    
}

module.exports = JwtIssuerUpsertCommand;