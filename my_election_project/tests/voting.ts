import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingProgram } from "../target/types/voting_program";
import { expect } from "chai";
import fs from "fs";
import nacl from "tweetnacl";
import { Ed25519Program, TransactionInstruction } from "@solana/web3.js";

// Function to sign a message using Ed25519
// function signMessage(signer, messageBuffer) {
//   const signature = nacl.sign.detached(messageBuffer, signer.secretKey);
//   console.log("VA public key:", signer.publicKey);
//   console.log("Signature Length:", signature.length);
//   return signature;
// }

// function signMessage(signer, messageBuffer) {
//   console.log("VA public key:", signer.publicKey);
//   const messageUint8 = new Uint8Array(messageBuffer);
//   const signature = nacl.sign.detached(messageUint8, signer.secretKey);
//   console.log("message unit8 and signature ", messageUint8, signature);
//   return nacl.sign.detached(new Uint8Array(messageBuffer), signer.secretKey);
// }

function signMessage(signer, messageBuffer) {
  console.log("VA public key:", signer.publicKey.toBase58());

  const messageUint8 = new Uint8Array(messageBuffer);
  const signature = nacl.sign.detached(messageUint8, signer.secretKey);

  console.log("🔍 Signed message:", Buffer.from(messageUint8).toString("hex"));
  console.log("🔏 Signature:", Buffer.from(signature).toString("hex"));

  return { signature, messageUint8 };
}

describe("voting_program", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingProgram as Program<VotingProgram>;
  const systemProgramAccount = new anchor.web3.PublicKey("11111111111111111111111111111111");

  // Load the admin keypair from file
  const admin = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync("/Users/wikusia/Desktop/my-election-app/my_election_project/path/to/admin-keypair.json", "utf8")))
  );

  const voter = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();
  const nonAdmin = anchor.web3.Keypair.generate();
  const votingAuthority = anchor.web3.Keypair.generate();
  const electionId = "12345";
  const stake = new anchor.BN(10);

  let electionPDA;
  let registeredVotersPDA;
  let voterPDA;
  let voterPDA2;

  before(async () => {
    try {
        // Airdrop SOL to the admin
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(admin.publicKey, 2e9), // 2 SOL
            "confirmed"
        );

        // Airdrop SOL to the voting authority (VA)
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(votingAuthority.publicKey, 2e9), // 2 SOL
            "confirmed"
        );

        // Airdrop SOL to the voter
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(voter.publicKey, 2e9), // 2 SOL
            "confirmed"
        );

        // Airdrop SOL to the voter
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(voter2.publicKey, 2e9), // 2 SOL
          "confirmed"
        );

        // Derive PDAs
        [electionPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("election"), admin.publicKey.toBuffer()],
            program.programId
        );

        [registeredVotersPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("registered_voters"), electionPDA.toBuffer()],
            program.programId
        );

        [voterPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("voter"), voter.publicKey.toBuffer()],
            program.programId
        );

        [voterPDA2] = await anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("voter2"), voter.publicKey.toBuffer()],
          program.programId
        );

        console.log("Election PDA:", electionPDA.toBase58());
        console.log("Registered Voters PDA:", registeredVotersPDA.toBase58());
        console.log("Admin Public Key:", admin.publicKey.toBase58());
        console.log("Voting Authority:", votingAuthority.publicKey.toBase58());
        console.log("Voter", voter.publicKey.toBase58());

        // Initialize election
        await program.methods
            .initialize("Test Election", votingAuthority.publicKey, "12345")
            .accounts({
                election: electionPDA,
                registeredVoters: registeredVotersPDA,
                user: admin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

    } catch (error) {
        console.error("Error in before() hook:", error);
        throw error;
    }
});

  it("Ensures the stored Voting Authority address is correct", async () => {
    const election = await program.account.election.fetch(electionPDA);
    
    // Check if the voting authority in the contract is correct
    expect(election.votingAuthority.toBase58()).to.equal(votingAuthority.publicKey.toBase58());
  });

  it("Admin can start election", async () => {
    await program.methods
      .startVoting()
      .accounts({
        election: electionPDA,
        user: admin.publicKey,
        systemProgram: systemProgramAccount,
      })
      .signers([admin])
      .rpc();

    let election = await program.account.election.fetch(electionPDA);
    expect(election.isActive).to.be.true;
  });

  it("Non-admin cannot start election", async () => {
    try {
      await program.methods
        .startVoting()
        .accounts({
          election: electionPDA,
          user: nonAdmin.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([nonAdmin])
        .rpc();
      throw new Error("Non-admin was able to start the election!");
    } catch (err) {
      expect(err.message).to.include("Unauthorized");
    }
  });

  it("Admin can end election", async () => {
    await program.methods
      .endVoting()
      .accounts({
        election: electionPDA,
        user: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    let election = await program.account.election.fetch(electionPDA);
    expect(election.isActive).to.be.false;
  });

  it("Non-admin cannot end election", async () => {
    try {
      await program.methods
        .endVoting()
        .accounts({
          election: electionPDA,
          user: nonAdmin.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([nonAdmin])
        .rpc();
      throw new Error("Non-admin was able to end the election!");
    } catch (err) {
      expect(err.message).to.include("Unauthorized");
    }
  });

  it("Anyone can get election ID", async () => {
    const election = await program.account.election.fetch(electionPDA);
    expect(election.electionId).to.equal("12345");
  });

  it("VA can register voter with valid Ed25519 signature", async () => {
    const messageBuffer = Buffer.concat([
      voter.publicKey.toBuffer(),
      stake.toArrayLike(Buffer, "le", 8),
      Buffer.from(electionId),
    ]);
  
    //const signature = signMessage(votingAuthority, messageBuffer);

    const { signature, messageUint8 } = signMessage(votingAuthority, messageBuffer);

    const instructionData = Buffer.concat([
      Buffer.from(signature),                      // 64-byte signature
      votingAuthority.publicKey.toBuffer(),        // 32-byte public key
      messageBuffer                                 // Original message
    ]);
  
    const ed25519Instruction = new TransactionInstruction({
      keys: [],
      programId: Ed25519Program.programId,
      data: instructionData
    });

    // const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
    //   publicKey: votingAuthority.publicKey.toBuffer(),
    //   message: messageBuffer,
    //   signature,
    // });
  
    console.log("✅ Signing message (hex):", messageBuffer.toString("hex"));
    console.log("✅ Signature (hex):", Buffer.from(signature).toString("hex"));
    console.log("✅ Ed25519 Instruction Data (hex):", ed25519Instruction.data.toString("hex"));

    console.log("Using SYSVAR_INSTRUCTIONS_PUBKEY:", anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY.toBase58());
    
    const voterAccount = await provider.connection.getAccountInfo(voterPDA);
    if (voterAccount) {
      console.log("❌ Voter PDA already exists! Test should not try to re-register.");
    }


  console.log("GOOOD 1");
    await program.methods
      .registerVoter(voter.publicKey, stake)
      .accounts({
        election: electionPDA,
        registeredVoters: registeredVotersPDA,
        voter: voterPDA,
        user: votingAuthority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .postInstructions([ed25519Instruction])
      //.preInstructions([ed25519Instruction])
      .signers([votingAuthority])
      .rpc();
  
      console.log("GOOOD");

    let registeredVotersAfter = await program.account.registeredVoters.fetch(registeredVotersPDA);
    expect(registeredVotersAfter.registeredAddresses.map(pk => pk.toBase58())).to.include(voter.publicKey.toBase58());
    console.log("✅ Registered Voters After:", registeredVotersAfter.registeredAddresses.map(pk => pk.toBase58()));
  
    // Verify Voter PDA Creation
    try {
      let voterAccount = await program.account.voter.fetch(voterPDA);
      console.log("✅ Voter PDA Created:", voterPDA.toBase58());
      expect(voterAccount).to.exist;
    } catch (error) {
      console.error("❌ Voter PDA not found!", error);
      throw new Error("Voter PDA was not created!");
    }
  });


  // it("VA can register a voter and ensure PDA is created", async () => {
  //   // Log before the transaction to see the current state
  //   let registeredVotersBefore = await program.account.registeredVoters.fetch(
  //     registeredVotersPDA
  //   );
  //   console.log("Registered Voters Before:", registeredVotersBefore);
  
  //   // Register the voter
  //   await program.methods
  //     .registerVoter(voter.publicKey, new anchor.BN(10))
  //     .accounts({
  //       election: electionPDA,
  //       registeredVoters: registeredVotersPDA,
  //       voter: voterPDA,  // This is used for storing voter data (not the address)
  //       user: votingAuthority.publicKey,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .signers([votingAuthority])
  //     .rpc();
  
  //   // Log after the transaction to check if the voter is registered
  //   let registeredVotersAfter = await program.account.registeredVoters.fetch(
  //     registeredVotersPDA
  //   );
  //   console.log("Registered Voters After:", registeredVotersAfter);
  
  //   // Assert if the voter public key is in the registered addresses list
  //   expect(registeredVotersAfter.registeredAddresses.map(pk => pk.toBase58())).to.include(voter.publicKey.toBase58());

  
  //   // Check if the voter's PDA exists
  //   try {
  //     // Try to fetch the voter PDA account
  //     let voterAccount = await program.account.voter.fetch(voterPDA);
  //     console.log("Voter PDA data:", voterAccount);
  //     console.log("PDA public key", voterPDA.toBase58());
  //     expect(voterAccount).to.exist;  // If the account exists, the voter PDA was created
  //   } catch (error) {
  //     // If the fetch fails, the PDA was not created
  //     console.error("Error fetching voter PDA:", error);
  //     throw new Error("Voter PDA was not created!");
  //   }
  // });  
  

  // it("Non-VA cannot register voter", async () => {
  //   try {
  //     await program.methods
  //       .registerVoter(voter.publicKey, new anchor.BN(10))
  //       .accounts({
  //         election: electionPDA,
  //         registeredVoters: registeredVotersPDA,
  //         voter2: voterPDA2,
  //         user: nonAdmin.publicKey,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //       })
  //       .signers([nonAdmin])
  //       .rpc();
      
  //     throw new Error("Non-VA was able to register a voter!");
  //   } catch (err) {
  //     console.error(err.message);  // Print the error message for debugging
  //     expect(err.message).to.include("not authorized to perform");
  //     // Check that the voter PDA was NOT created
  //     try {
  //       let voterAccount = await program.account.voter.fetch(voterPDA2);
  //       throw new Error("Voter PDA was incorrectly created by a non-VA!");
  //     } catch (fetchErr) {
  //       expect(fetchErr.message).to.include("Account does not exist");
  //     }
  //   }
  // });
  

  // it("A voter can't be registered twice", async () => {
  //   try {
  //     await program.methods
  //       .registerVoter(voter.publicKey, new anchor.BN(10))
  //       .accounts({
  //         election: electionPDA,
  //         registeredVoters: registeredVotersPDA,
  //         voter: voterPDA,
  //         user: votingAuthority.publicKey,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //       })
  //       .signers([votingAuthority])
  //       .rpc();
      
  //     throw new Error("Voter was registered twice!");
  //   } catch (err) {
  //     expect(err.message).to.include("already registered.");
  
  //     // Check that the voter PDA was not modified
  //     let voterAccount = await program.account.voter.fetch(voterPDA);
  //     expect(voterAccount).to.exist;  // Ensure PDA still exists
  //   }
  // });
  

  // it("Ensure correct PDA derivation", async () => {
  //   const [expectedVoterPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from("voter"), voter.publicKey.toBuffer()],
  //     program.programId
  //   );

  //   expect(voterPDA.toBase58()).to.equal(expectedVoterPDA.toBase58());
  // });
});
