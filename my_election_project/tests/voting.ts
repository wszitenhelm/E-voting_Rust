import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingSystem } from "../target/types/voting_system";
import { expect } from "chai";
import fs from "fs";
import nacl from "tweetnacl";
import { Transaction, Ed25519Program, TransactionInstruction, Keypair, PublicKey } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

function signMessage(signer: Keypair, message: Buffer){
  const messageUint8 = new Uint8Array(message);
  const signature = nacl.sign.detached(messageUint8, signer.secretKey);
  return { signature, messageUint8 };
}

describe("voting_system", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingSystem as Program<VotingSystem>;
  const systemProgram = anchor.web3.SystemProgram.programId;

  const admin = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync("/Users/wikusia/Desktop/my-election-app/my_election_project/path/to/admin-keypair.json", "utf8")))
  );

  //const admin = Keypair.generate();
  const voter1 = Keypair.generate();
  const voter2 = Keypair.generate();
  const votingAuthority = Keypair.generate();
  const nonAdmin = Keypair.generate();
  const electionId = "12345";
  const stake = new anchor.BN(10);

  let electionPDA: PublicKey;
  let voter1PDA: PublicKey;
  let voter2PDA: PublicKey;

  before(async () => {
    try {
      const connectionStatus = await provider.connection.getVersion();
      console.log("Local validator version:", connectionStatus["solana-core"]);

      const airdropPromises = [
        provider.connection.requestAirdrop(admin.publicKey, 2e9).then(sig => {
          console.log(`Airdrop to admin (${admin.publicKey.toBase58()}): ${sig}`);
          return sig;
        }),
        provider.connection.requestAirdrop(votingAuthority.publicKey, 2e9).then(sig => {
          console.log(`Airdrop to VA (${votingAuthority.publicKey.toBase58()}): ${sig}`);
          return sig;
        }),
        provider.connection.requestAirdrop(voter1.publicKey, 2e9).then(sig => {
          console.log(`Airdrop to voter1 (${voter1.publicKey.toBase58()}): ${sig}`);
          return sig;
        }),
        provider.connection.requestAirdrop(voter2.publicKey, 2e9).then(sig => {
          console.log(`Airdrop to voter2 (${voter2.publicKey.toBase58()}): ${sig}`);
          return sig;
        }),
        provider.connection.requestAirdrop(nonAdmin.publicKey, 2e9).then(sig => {
          console.log(`Airdrop to nonAdmin (${nonAdmin.publicKey.toBase58()}): ${sig}`);
          return sig;
        }),
      ];

      const signatures = await Promise.all(airdropPromises);
      await Promise.all(signatures.map(sig => {
        if (!sig) throw new Error(`Airdrop signature is undefined`);
        return provider.connection.confirmTransaction(sig, "confirmed");
      }));

      [electionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("election"), admin.publicKey.toBuffer()],
        program.programId
      );
      [voter1PDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("voter"), voter1.publicKey.toBuffer()],
        program.programId
      );
      [voter2PDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("voter"), voter2.publicKey.toBuffer()],
        program.programId
      );

      const [expectedElectionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("election"), admin.publicKey.toBuffer()],
        program.programId
      );

      if (!electionPDA.equals(expectedElectionPDA)) {
        throw new Error("Mismatch in Election PDA calculation!");
      }

      // console.log({
      //   electionPDA: electionPDA.toBase58(),
      //   adminPubkey: admin.publicKey.toBase58(),
      //   systemProgram: systemProgram.toBase58(),
      //   votingAuthority: votingAuthority.publicKey.toBase58()
      // });
      

      const initTxSig = await program.methods
        .initialize("Test Election", votingAuthority.publicKey, electionId, new anchor.BN(600), new anchor.BN(300))
        .accountsStrict({
          election: electionPDA,
          user: admin.publicKey,
          systemProgram,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      
      try {
        const election = await program.account.election.fetch(electionPDA);
        console.log("Election Account:", election);
      
        if (!election || !election.votingAuthority) {
          throw new Error("Election account is initialized but missing critical data!");
        }
      } catch (error) {
        console.error("Election account fetch failed:", error);
      }

      await provider.connection.confirmTransaction({
        signature: initTxSig,
        blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
        lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
      },'confirmed');
      
    } catch (error) {
      console.error("Error in before() hook:", error);
      throw error;
    }
  });  

  it("Ensures the stored Voting Authority address is correct", async () => {
    const election = await program.account.election.fetch(electionPDA);
    expect(election.votingAuthority.toBase58()).to.equal(votingAuthority.publicKey.toBase58());
  });

  it("Admin can start election", async () => {
    
    await program.methods
      .startElection()
      .accounts({
        election: electionPDA,
        user: admin.publicKey
      })
      .signers([admin])
      .rpc({ commitment: "confirmed" });

    const election = await program.account.election.fetch(electionPDA);
    expect(election.isActive).to.be.true;
  });

  it("Non-admin cannot start election", async () => {
    try {
      await program.methods
        .startElection()
        .accounts({
          election: electionPDA,
          user: nonAdmin.publicKey
        })
        .signers([nonAdmin])
        .rpc({ commitment: "confirmed" });
      expect.fail("Non-admin should not be able to start the election");
    } catch (err) {
      expect(err.message).to.include("Unauthorized");
    }
  });

  it("Non-admin cannot end election", async () => {
    try {
      await program.methods
        .endVoting()
        .accounts({
          election: electionPDA,
          user: nonAdmin.publicKey
        })
        .signers([nonAdmin])
        .rpc({ commitment: "confirmed" });
      expect.fail("Non-admin should not be able to end the election");
    } catch (err) {
      expect(err.message).to.include("Unauthorized");
    }
  });

  it("Admin can end election", async () => {
    await program.methods
      .endVoting()
      .accounts({
        election: electionPDA,
        user: admin.publicKey
      })
      .signers([admin])
      .rpc({ commitment: "confirmed" });

    const election = await program.account.election.fetch(electionPDA);
    expect(election.isActive).to.be.false;
  });

  it("Anyone can get election ID", async () => {
    const election = await program.account.election.fetch(electionPDA);
    expect(election.electionId).to.equal(electionId);
  });


  it("should verify an Ed25519 signature successfully", async () => {
    const provider = anchor.getProvider();
    const testAuthority = anchor.web3.Keypair.generate();
    const testMessage = Buffer.from("Test Ed25519 Signature", "utf-8");
    
    // Sign message
    const { signature, messageUint8 } = signMessage(testAuthority, testMessage);

    const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
        privateKey: testAuthority.secretKey,
        message: testMessage,
    });

    const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000, // Increase from the default (200,000)
    });
    
    try {
        const transaction = new Transaction().add(computeBudgetIx).add(ed25519Instruction);
        const txSignature = await provider.sendAndConfirm(transaction, [], { commitment: "confirmed" });
        console.log("Transaction Signature:", txSignature);
        expect(txSignature).to.be.a("string");
    } catch (err) {
        console.error("Ed25519 Signature Verification Failed:", err);
        throw err;
    }
});

it("VA should be able to register a voter with a valid signature", async () => {
  const provider = anchor.getProvider();
  const testAuthority1 = anchor.web3.Keypair.generate();
  // public key - stake - electionId
  //const testMessage = Buffer.from("7vRWomYoLKJXPAtyB5cWxZ3hR2qWu1c2hqqx6Azt914N-20-12345", "utf-8");

  const bs58 = require("bs58"); // Ensure you have the bs58 package installed
  const voter1 = anchor.web3.Keypair.generate();
  const voterPublicKey = bs58.encode(voter1.publicKey.toBytes()); // Encode public key as base58
  const stake = "34"; // Use the exact stake value
  const electionId = "12345"; // Election ID // assume election ID is 5 digit string

  const testMessage = Buffer.from(`${voterPublicKey}-${stake}-${electionId}`, "utf-8");

  // console.log("✅ Expected Message (Hex):", testMessage.toString("hex"));
  // console.log("✅ Expected Message (UTF-8):", testMessage.toString("utf-8"));
  // console.log("Program ID:", program.programId.toBase58());

  try {
    const election = await program.account.election.fetch(electionPDA);
    //console.log("Election Account already exists:", election);
  } catch (error) {
    console.log("Election account does not exist, initializing...");
  
    const tx = await program.methods
      .initialize("Test Election", votingAuthority.publicKey, electionId, new anchor.BN(600), new anchor.BN(300))
      .accountsStrict({
        election: electionPDA,
        user: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    
    const electionAfter = await program.account.election.fetch(electionPDA);
    //console.log("Initialized Election Account:", electionAfter);
  }

  console.log("✅ Election initialized!");

  const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: votingAuthority.secretKey,
      message: testMessage,
  });


  console.log("Ed25519 Instruction:", ed25519Instruction);
  console.log("Ed25519 Instruction.data:", ed25519Instruction.data);
  console.log("🔹 Ed25519 TEST FILE Data Hex:", Buffer.from(ed25519Instruction.data).toString("hex"));
  // console.log("test message", testMessage);
  // console.log("Test message (hex):", Buffer.from(testMessage).toString("hex"));
  // console.log("SIGNER", votingAuthority.publicKey);
  // console.log("voter registred public key", voter1.publicKey)

  // Step 3: **Increase compute budget for verification**
  const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
  });

  //console.log("✅ Reached Ed25519 verification");

  const electionAccount = await provider.connection.getAccountInfo(electionPDA);
  if (!electionAccount) {
    console.error("Election account does not exist!");
  } else {
    console.log("Election Account Owner:", electionAccount.owner.toBase58());
  }
  
  const [voterPDA, voterBump] = await anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("voter"), voter1.publicKey.toBuffer()],
    program.programId
  );

  const electionData = await program.account.election.fetch(electionPDA);

  const registerVoterIx = await program.methods
      .registerVoter(voter1.publicKey, new anchor.BN(34)) // Example stake amount
      .accountsStrict({
          election: electionPDA,
          voter: voterPDA,
          votingAuthority: votingAuthority.publicKey,
          systemProgram,
          instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

  try {
      const transaction = new Transaction()
          .add(computeBudgetIx)
          .add(ed25519Instruction)
          .add(registerVoterIx);

      const txSignature = await provider.sendAndConfirm(transaction, [votingAuthority], { commitment: "confirmed" });

      const txInfo = await provider.connection.getTransaction(txSignature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0, // Ensures compatibility with older versions
    });
      // TO SEE ALL THE LOGS !!!
      console.log("Transaction Logs:", txInfo?.meta?.logMessages);
      //console.log("✅ Transaction Successful! Signature:", txSignature);
      const voterAccount = await provider.connection.getAccountInfo(voterPDA);
      if (voterAccount) {
          //console.log("Voter PDA Owner:", voterAccount.owner.toBase58());
          console.log("Voter account:", voterAccount);
      } else {
          console.log("Voter PDA does not exist yet.");
      }
      expect(txSignature).to.be.a("string");
  } catch (err) {
      console.error("❌ Register Voter Transaction Failed:", err);
      throw err;
  }
});

it("VA should be able to register a voter with not valid signature", async () => {
  const provider = anchor.getProvider();
  const testAuthority1 = anchor.web3.Keypair.generate();
  // public key - stake - electionId
  //const testMessage = Buffer.from("7vRWomYoLKJXPAtyB5cWxZ3hR2qWu1c2hqqx6Azt914N-20-12345", "utf-8");

  const bs58 = require("bs58"); // Ensure you have the bs58 package installed
  const voter2 = anchor.web3.Keypair.generate();
  const voterPublicKey = bs58.encode(voter2.publicKey.toBytes()); // Encode public key as base58
  const stake = "20"; // Use the exact stake value
  const electionId = "12345"; // Election ID // assume election ID is 5 digit string

  const testMessage = Buffer.from(`${voterPublicKey}-${stake}-${electionId}`, "utf-8");

  try {
    const election = await program.account.election.fetch(electionPDA);
    //console.log("Election Account already exists:", election);
  } catch (error) {
    console.log("Election account does not exist, initializing...");
  
    const tx = await program.methods
      .initialize("Test Election", votingAuthority.publicKey, electionId, new anchor.BN(600), new anchor.BN(300))
      .accountsStrict({
        election: electionPDA,
        user: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    
    const electionAfter = await program.account.election.fetch(electionPDA);
    //console.log("Initialized Election Account:", electionAfter);
  }

  console.log("✅ Election initialized!");

  const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: admin.secretKey,
      message: testMessage,
  });

  // Step 3: **Increase compute budget for verification**
  const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
  });

  //console.log("✅ Reached Ed25519 verification");

  const electionAccount = await provider.connection.getAccountInfo(electionPDA);
  if (!electionAccount) {
    console.error("Election account does not exist!");
  } else {
    console.log("Election Account Owner:", electionAccount.owner.toBase58());
  }
  
  const [voterPDA2, voterBump] = await anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("voter"), voter2.publicKey.toBuffer()],
    program.programId
  );

  const electionData = await program.account.election.fetch(electionPDA);

  const registerVoterIx = await program.methods
      .registerVoter(voter2.publicKey, new anchor.BN(20)) // Example stake amount
      .accountsStrict({
          election: electionPDA,
          voter: voterPDA2,
          votingAuthority: votingAuthority.publicKey,
          systemProgram,
          instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

      try {
        const transaction = new Transaction()
            .add(computeBudgetIx)
            .add(ed25519Instruction)
            .add(registerVoterIx);
    
        const txSignature = await provider.sendAndConfirm(transaction, [votingAuthority], { commitment: "confirmed" });
    
        const txInfo = await provider.connection.getTransaction(txSignature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0, // Ensures compatibility with older versions
        });
    
        // TO SEE ALL THE LOGS !!!
        console.log("Transaction Logs:", txInfo?.meta?.logMessages);
    
        // Check if the voter PDA exists (it shouldn't)
        const voterAccount = await provider.connection.getAccountInfo(voterPDA2);
    
        if (voterAccount) {
            console.log("❌ Voter PDA should not exist, but it does:", voterAccount);
            throw new Error("Voter registration should have failed, but it succeeded.");
        } else {
            console.log("✅ Voter PDA does not exist, as expected.");
        }
    
        // If the transaction succeeded when it should have failed, throw an error
        throw new Error("❌ Register Voter Transaction should have failed but succeeded.");
    } catch (err) {
        console.log("✅ Register Voter Transaction failed as expected:", err.message);
        
        // Ensure the error is what we expect
        //expect(err.message).to.include("custom program error"); // Modify based on actual error message
    }
    


});
});

  
  // it("Fails to register voter with missing Ed25519 instruction", async () => {
  //   try {
  //     await program.methods
  //       .registerVoter(voter2.publicKey, stake)
  //       .accounts({
  //         election: electionPDA,
  //         voter: voter2PDA,
  //         user: votingAuthority.publicKey,
  //         systemProgram,
  //         instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //       })
  //       .signers([votingAuthority])
  //       .rpc({ commitment: "confirmed" });
  //     expect.fail("Should have failed with missing Ed25519 instruction");
  //   } catch (err) {
  //     expect(err.message).to.include("No Ed25519Program instruction found");
  //   }
  // });

  // it("Non-VA cannot register voter", async () => {
  //   const messageBuffer = Buffer.concat([
  //     voter2.publicKey.toBuffer(),
  //     stake.toArrayLike(Buffer, "le", 8),
  //     Buffer.from(electionId),
  //   ]);

  //   const { signature } = signMessage(nonAdmin, messageBuffer);
  //   const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
  //     publicKey: nonAdmin.publicKey.toBuffer(),
  //     message: messageBuffer,
  //     signature,
  //   });

  //   try {
  //     await program.methods
  //       .registerVoter(voter2.publicKey, stake)
  //       .accounts({
  //         election: electionPDA,
  //         voter: voter2PDA,
  //         user: nonAdmin.publicKey,
  //         systemProgram,
  //         instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //       })
  //       .preInstructions([ed25519Instruction])
  //       .signers([nonAdmin])
  //       .rpc({ commitment: "confirmed" });
  //     expect.fail("Non-VA should not be able to register voter");
  //   } catch (err) {
  //     expect(err.message).to.include("Unauthorized");
  //   }
  // });

  // it("Fails to register voter when election is active", async () => {
  //   await program.methods
  //     .startElection()
  //     .accounts({
  //       election: electionPDA,
  //       user: admin.publicKey,
  //       systemProgram,
  //     })
  //     .signers([admin])
  //     .rpc({ commitment: "confirmed" });

  //   const messageBuffer = Buffer.concat([
  //     voter2.publicKey.toBuffer(),
  //     stake.toArrayLike(Buffer, "le", 8),
  //     Buffer.from(electionId),
  //   ]);

  //   const { signature } = signMessage(votingAuthority, messageBuffer);
  //   const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
  //     publicKey: votingAuthority.publicKey.toBuffer(),
  //     message: messageBuffer,
  //     signature,
  //   });

  //   try {
  //     await program.methods
  //       .registerVoter(voter2.publicKey, stake)
  //       .accounts({
  //         election: electionPDA,
  //         voter: voter2PDA,
  //         user: votingAuthority.publicKey,
  //         systemProgram,
  //         instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //       })
  //       .preInstructions([ed25519Instruction])
  //       .signers([votingAuthority])
  //       .rpc({ commitment: "confirmed" });
  //     expect.fail("Should have failed when election is active");
  //   } catch (err) {
  //     expect(err.message).to.include("VotingAlreadyStarted");
  //   }

  //   await program.methods
  //     .endVoting()
  //     .accounts({
  //       election: electionPDA,
  //       user: admin.publicKey,
  //       systemProgram,
  //     })
  //     .signers([admin])
  //     .rpc({ commitment: "confirmed" });
  // });

  // it("Fails to register voter if already registered", async () => {
  //   const messageBuffer = Buffer.concat([
  //     voter1.publicKey.toBuffer(),
  //     stake.toArrayLike(Buffer, "le", 8),
  //     Buffer.from(electionId),
  //   ]);

  //   const { signature } = signMessage(votingAuthority, messageBuffer);
  //   const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
  //     publicKey: votingAuthority.publicKey.toBuffer(),
  //     message: messageBuffer,
  //     signature,
  //   });

  //   try {
  //     await program.methods
  //       .registerVoter(voter1.publicKey, stake)
  //       .accounts({
  //         election: electionPDA,
  //         voter: voter1PDA,
  //         user: votingAuthority.publicKey,
  //         systemProgram,
  //         instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //       })
  //       .preInstructions([ed25519Instruction])
  //       .signers([votingAuthority])
  //       .rpc({ commitment: "confirmed" });
  //     expect.fail("Should have failed for already registered voter");
  //   } catch (err) {
  //     expect(err.message).to.include("VoterAlreadyRegistered");
  //   }
  // });
// });