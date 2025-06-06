"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const chai_1 = require("chai");
const fs_1 = __importDefault(require("fs"));
describe("voting_program", () => {
    const provider = anchor.AnchorProvider.local();
    anchor.setProvider(provider);
    const program = anchor.workspace.VotingProgram;
    const systemProgramAccount = new anchor.web3.PublicKey("11111111111111111111111111111111");
    // Load the admin keypair from file
    const admin = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs_1.default.readFileSync("/Users/wikusia/Desktop/my-election-app/my_election_project/path/to/admin-keypair.json", "utf8"))));
    const voter = anchor.web3.Keypair.generate();
    const voter2 = anchor.web3.Keypair.generate();
    const nonAdmin = anchor.web3.Keypair.generate();
    const votingAuthority = anchor.web3.Keypair.generate();
    let electionPDA;
    let registeredVotersPDA;
    let voterPDA;
    let voterPDA2;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Airdrop SOL to the admin
            yield provider.connection.confirmTransaction(yield provider.connection.requestAirdrop(admin.publicKey, 2e9), // 2 SOL
            "confirmed");
            // Airdrop SOL to the voting authority (VA)
            yield provider.connection.confirmTransaction(yield provider.connection.requestAirdrop(votingAuthority.publicKey, 2e9), // 2 SOL
            "confirmed");
            // Airdrop SOL to the voter
            yield provider.connection.confirmTransaction(yield provider.connection.requestAirdrop(voter.publicKey, 2e9), // 2 SOL
            "confirmed");
            // Airdrop SOL to the voter
            yield provider.connection.confirmTransaction(yield provider.connection.requestAirdrop(voter2.publicKey, 2e9), // 2 SOL
            "confirmed");
            // Derive PDAs
            [electionPDA] = yield anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("election"), admin.publicKey.toBuffer()], program.programId);
            [registeredVotersPDA] = yield anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("registered_voters"), electionPDA.toBuffer()], program.programId);
            [voterPDA] = yield anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("voter"), voter.publicKey.toBuffer()], program.programId);
            [voterPDA2] = yield anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("voter2"), voter.publicKey.toBuffer()], program.programId);
            console.log("Election PDA:", electionPDA.toBase58());
            console.log("Registered Voters PDA:", registeredVotersPDA.toBase58());
            console.log("Admin Public Key:", admin.publicKey.toBase58());
            console.log("Voting Authority:", votingAuthority.publicKey.toBase58());
            console.log("Voter", voter.publicKey.toBase58());
            // Initialize election
            yield program.methods
                .initialize("Test Election", votingAuthority.publicKey, "12345")
                .accounts({
                election: electionPDA,
                registeredVoters: registeredVotersPDA,
                user: admin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
                .signers([admin])
                .rpc();
        }
        catch (error) {
            console.error("Error in before() hook:", error);
            throw error;
        }
    }));
    it("Ensures the stored Voting Authority address is correct", () => __awaiter(void 0, void 0, void 0, function* () {
        const election = yield program.account.election.fetch(electionPDA);
        // Check if the voting authority in the contract is correct
        (0, chai_1.expect)(election.votingAuthority.toBase58()).to.equal(votingAuthority.publicKey.toBase58());
    }));
    it("Admin can start election", () => __awaiter(void 0, void 0, void 0, function* () {
        yield program.methods
            .startVoting()
            .accounts({
            election: electionPDA,
            user: admin.publicKey,
            systemProgram: systemProgramAccount,
        })
            .signers([admin])
            .rpc();
        let election = yield program.account.election.fetch(electionPDA);
        (0, chai_1.expect)(election.isActive).to.be.true;
    }));
    it("Non-admin cannot start election", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield program.methods
                .startVoting()
                .accounts({
                election: electionPDA,
                user: nonAdmin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
                .signers([nonAdmin])
                .rpc();
            throw new Error("Non-admin was able to start the election!");
        }
        catch (err) {
            (0, chai_1.expect)(err.message).to.include("Unauthorized");
        }
    }));
    it("Admin can end election", () => __awaiter(void 0, void 0, void 0, function* () {
        yield program.methods
            .endVoting()
            .accounts({
            election: electionPDA,
            user: admin.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .signers([admin])
            .rpc();
        let election = yield program.account.election.fetch(electionPDA);
        (0, chai_1.expect)(election.isActive).to.be.false;
    }));
    it("Non-admin cannot end election", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield program.methods
                .endVoting()
                .accounts({
                election: electionPDA,
                user: nonAdmin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
                .signers([nonAdmin])
                .rpc();
            throw new Error("Non-admin was able to end the election!");
        }
        catch (err) {
            (0, chai_1.expect)(err.message).to.include("Unauthorized");
        }
    }));
    it("Anyone can get election ID", () => __awaiter(void 0, void 0, void 0, function* () {
        const election = yield program.account.election.fetch(electionPDA);
        (0, chai_1.expect)(election.electionId).to.equal("12345");
    }));
    it("VA can register a voter and ensure PDA is created", () => __awaiter(void 0, void 0, void 0, function* () {
        // Log before the transaction to see the current state
        let registeredVotersBefore = yield program.account.registeredVoters.fetch(registeredVotersPDA);
        console.log("Registered Voters Before:", registeredVotersBefore);
        // Register the voter
        yield program.methods
            .registerVoter(voter.publicKey, new anchor.BN(10))
            .accounts({
            election: electionPDA,
            registeredVoters: registeredVotersPDA,
            voter: voterPDA,
            user: votingAuthority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .signers([votingAuthority])
            .rpc();
        // Log after the transaction to check if the voter is registered
        let registeredVotersAfter = yield program.account.registeredVoters.fetch(registeredVotersPDA);
        console.log("Registered Voters After:", registeredVotersAfter);
        // Assert if the voter public key is in the registered addresses list
        (0, chai_1.expect)(registeredVotersAfter.registeredAddresses.map(pk => pk.toBase58())).to.include(voter.publicKey.toBase58());
        // Check if the voter's PDA exists
        try {
            // Try to fetch the voter PDA account
            let voterAccount = yield program.account.voter.fetch(voterPDA);
            console.log("Voter PDA data:", voterAccount);
            console.log("PDA public key", voterPDA.toBase58());
            (0, chai_1.expect)(voterAccount).to.exist; // If the account exists, the voter PDA was created
        }
        catch (error) {
            // If the fetch fails, the PDA was not created
            console.error("Error fetching voter PDA:", error);
            throw new Error("Voter PDA was not created!");
        }
    }));
    it("Non-VA cannot register voter", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield program.methods
                .registerVoter(voter.publicKey, new anchor.BN(10))
                .accounts({
                election: electionPDA,
                registeredVoters: registeredVotersPDA,
                voter2: voterPDA2,
                user: nonAdmin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
                .signers([nonAdmin])
                .rpc();
            throw new Error("Non-VA was able to register a voter!");
        }
        catch (err) {
            console.error(err.message); // Print the error message for debugging
            (0, chai_1.expect)(err.message).to.include("not authorized to perform");
            // Check that the voter PDA was NOT created
            try {
                let voterAccount = yield program.account.voter.fetch(voterPDA2);
                throw new Error("Voter PDA was incorrectly created by a non-VA!");
            }
            catch (fetchErr) {
                (0, chai_1.expect)(fetchErr.message).to.include("Account does not exist");
            }
        }
    }));
    it("A voter can't be registered twice", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield program.methods
                .registerVoter(voter.publicKey, new anchor.BN(10))
                .accounts({
                election: electionPDA,
                registeredVoters: registeredVotersPDA,
                voter: voterPDA,
                user: votingAuthority.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
                .signers([votingAuthority])
                .rpc();
            throw new Error("Voter was registered twice!");
        }
        catch (err) {
            (0, chai_1.expect)(err.message).to.include("already registered.");
            // Check that the voter PDA was not modified
            let voterAccount = yield program.account.voter.fetch(voterPDA);
            (0, chai_1.expect)(voterAccount).to.exist; // Ensure PDA still exists
        }
    }));
    it("Ensure correct PDA derivation", () => __awaiter(void 0, void 0, void 0, function* () {
        const [expectedVoterPDA] = yield anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("voter"), voter.publicKey.toBuffer()], program.programId);
        (0, chai_1.expect)(voterPDA.toBase58()).to.equal(expectedVoterPDA.toBase58());
    }));
});
