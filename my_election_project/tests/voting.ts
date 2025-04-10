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

      console.log("Expected Election PDA:", electionPDA.toBase58());

      const [expectedElectionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("election"), admin.publicKey.toBuffer()],
        program.programId
      );
      console.log("Calculated Election PDA:", expectedElectionPDA.toBase58());

      if (!electionPDA.equals(expectedElectionPDA)) {
        throw new Error("Mismatch in Election PDA calculation!");
      }


      console.log({
        electionPDA: electionPDA.toBase58(),
        adminPubkey: admin.publicKey.toBase58(),
        systemProgram: systemProgram.toBase58(),
        votingAuthority: votingAuthority.publicKey.toBase58()
      });
      

      const initTxSig = await program.methods
        .initialize("Test Election", votingAuthority.publicKey, electionId, new anchor.BN(600), new anchor.BN(300))
        .accountsStrict({
          election: electionPDA,
          user: admin.publicKey,
          systemProgram,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });

      console.log("Election initialization tx signature:", initTxSig);
      console.log("✅ Election initialized successfully! Tx Signature:", initTxSig);
      const election = await program.account.election.fetch(electionPDA);
      console.log("Election Account:", election);
      
      try {
        const election = await program.account.election.fetch(electionPDA);
        console.log("Election Account:", election);
      
        if (!election || !election.votingAuthority) {
          throw new Error("Election account is initialized but missing critical data!");
        }
      } catch (error) {
        console.error("Election account fetch failed:", error);
      }

      const accountInfo = await provider.connection.getAccountInfo(electionPDA);
      console.log("Raw Election Account Data:", accountInfo);

      console.log("Expected Program ID:", program.programId.toBase58());
      console.log("Election Owner:", accountInfo.owner.toBase58());
      
      //transaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;

      // Confirm transaction before fetching the election
      //await provider.connection.confirmTransaction(initTxSig, "finalized");

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

  // it("Initializes the election", async () => {
  //   [electionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from("election"), admin.publicKey.toBuffer()],
  //     program.programId
  //   );
  
  //   const tx = await program.methods
  //     .initialize("Test Election", votingAuthority.publicKey, electionId, new anchor.BN(600), new anchor.BN(300))
  //     .accounts([{
  //       election: electionPDA,
  //       user: admin.publicKey,
  //       systemProgram,
  // }])
  //     .signers([admin])
  //     .rpc({ commitment: "confirmed" });
  
  //   console.log("Election initialized. Tx:", tx);
  
  //   const election = await program.account.election.fetch(electionPDA);
  //   expect(election.electionId).to.equal(electionId);
  // });
  

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
    // console.log("Public key:", testAuthority.publicKey);
    // console.log("Generated Signature:", Buffer.from(signature).toString("hex"));

    const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
        privateKey: testAuthority.secretKey,
        message: testMessage,
    });

    const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000, // Increase from the default (200,000)
    });

    // console.log("TEST Ed25519 Instruction Data (hex):", ed25519Instruction.data.toString("hex"));
    // console.log("TEST Ed25519 Instruction Data (hex):", ed25519Instruction.data.toString("hex"));
    // console.log("voting authority publickey:", votingAuthority.publicKey);
    // console.log("test message:", testMessage)
    
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
const stake = "20"; // Use the exact stake value
const electionId = "12345"; // Election ID

const testMessage = Buffer.from(`${voterPublicKey}-${stake}-${electionId}`, "utf-8");

console.log("✅ Expected Message (Hex):", testMessage.toString("hex"));
console.log("✅ Expected Message (UTF-8):", testMessage.toString("utf-8"));

  //const testMessage = Buffer.from("8vRWomYoLKJXPAtyB5cWxZ3hR2qWu1c2hqqx6Azt914N-35-12345", "utf-8");


  console.log("Program ID:", program.programId.toBase58());


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
    console.log("Initialized Election Account:", electionAfter);
  }

  console.log("✅ Election initialized!");

  const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: votingAuthority.secretKey,
      message: testMessage,
  });

  console.log("Ed25519 Instruction:", ed25519Instruction);
  console.log("Ed25519 Instruction.data:", ed25519Instruction.data);
  console.log("🔹 Ed25519 TEST FILE Data Hex:", Buffer.from(ed25519Instruction.data).toString("hex"));
  console.log("test message", testMessage);
  console.log("Test message (hex):", Buffer.from(testMessage).toString("hex"));
  console.log("SIGNER", votingAuthority.publicKey);
  console.log("voter registred public key", voter1.publicKey)

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

//   const voterAccount = await provider.connection.getAccountInfo(voterPDA);
// if (voterAccount) {
//     console.log("Voter PDA Owner:", voterAccount.owner.toBase58());
// } else {
//     console.log("Voter PDA does not exist yet.");
// }

const electionData = await program.account.election.fetch(electionPDA);
//console.log("Election Data Before:", electionData);


  const registerVoterIx = await program.methods
      .registerVoter(voter1.publicKey, new anchor.BN(20)) // Example stake amount
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
        

      console.log("Transaction Logs:", txInfo?.meta?.logMessages);
      
      //console.log("Transaction Instructions:", transaction.instructions.map(ix => ix.programId.toBase58()));

      console.log("✅ Transaction Successful! Signature:", txSignature);
      const voterAccount = await provider.connection.getAccountInfo(voterPDA);
      if (voterAccount) {
          console.log("Voter PDA Owner:", voterAccount.owner.toBase58());

          // console.log("Stored Voter Public Key:", voterAccount.voterAddress.toBase58());
          // console.log("Expected Voter Public Key:", voter1.publicKey.toBase58());

          console.log("Voter account:", voterAccount);
      } else {
          console.log("Voter PDA does not exist yet.");
      }

      
      expect(txSignature).to.be.a("string");
  } catch (err) {
      console.error("❌ Register Voter Transaction Failed:", err);
      throw err;
  }


// it("VA should be able to register a voter with a valid signature", async () => {
//     const provider = anchor.getProvider();
//     const testAuthority1 = anchor.web3.Keypair.generate();
//     const testMessage = Buffer.from("B3UqvsahBcrw7EZK67QHeX3WqRZQSa1srM26NUeweqjA-20", "utf-8");

//     console.log("Program ID:", program.programId.toBase58());


//     // Generate VA and voter keypairs
//     //const votingAuthority = anchor.web3.Keypair.generate();
//     const voter1 = anchor.web3.Keypair.generate();
    
//     // Generate PDAs
//     // const [electionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
//     //     [Buffer.from("election"), admin.publicKey.toBuffer()],
//     //     program.programId
//     // );

//     // const [voter1PDA] = anchor.web3.PublicKey.findProgramAddressSync(
//     //     [Buffer.from("voter"), electionPDA.toBuffer(), voter1.publicKey.toBuffer()],
//     //     program.programId
//     // );


//     try {
//       const election = await program.account.election.fetch(electionPDA);
//       console.log("Election Account already exists:", election);
//     } catch (error) {
//       console.log("Election account does not exist, initializing...");
    
//       const tx = await program.methods
//         .initialize("Test Election", votingAuthority.publicKey, electionId, new anchor.BN(600), new anchor.BN(300))
//         .accountsStrict({
//           election: electionPDA,
//           user: admin.publicKey,
//           systemProgram: anchor.web3.SystemProgram.programId,
//         })
//         .signers([admin])
//         .rpc();
    
//       //await provider.connection.confirmTransaction(tx, "confirmed");
    
//       const electionAfter = await program.account.election.fetch(electionPDA);
//       console.log("Initialized Election Account:", electionAfter);
//     }


//     console.log("✅ Election initialized!");

//     // Step 2: **Sign message for Ed25519 signature**
//     //const testMessage = Buffer.from(voter1.publicKey.toBuffer());

//     const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
//         privateKey: testAuthority1.secretKey,
//         message: testMessage,
//     });

//   //   const ed25519Instruction = new TransactionInstruction({
//   //     keys: [],
//   //     programId: new PublicKey("Ed25519SigVerify111111111111111111111111111"),
//   //     data: Buffer.concat([
//   //         Buffer.from([1, 0, 64, 0, 96, 0]), // Fix offsets (64 for pubkey, 96 for message)
//   //         testAuthority1.publicKey.toBuffer(), // Correctly formatted public key
//   //         testMessage, // Correct message
//   //     ]),
//   // });

//     console.log("Ed25519 Instruction:", ed25519Instruction);

//     console.log("🔹 Ed25519 TEST FILE Data Hex:", Buffer.from(ed25519Instruction.data).toString("hex"));


//     // Step 3: **Increase compute budget for verification**
//     const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
//         units: 500_000,
//     });

//     console.log("✅ Reached Ed25519 verification");

//     const electionAccount = await provider.connection.getAccountInfo(electionPDA);
//     if (!electionAccount) {
//       console.error("Election account does not exist!");
//     } else {
//       console.log("Election Account Owner:", electionAccount.owner.toBase58());
//     }
    
//     const [voterPDA, voterBump] = await anchor.web3.PublicKey.findProgramAddressSync(
//       [Buffer.from("voter"), voter1.publicKey.toBuffer()],
//       program.programId
//     );


//     // Step 4: **Create RegisterVoter instruction**
//     const registerVoterIx = await program.methods
//         .registerVoter(voter1.publicKey, new anchor.BN(100)) // Example stake amount
//         .accountsStrict({
//             election: electionPDA,
//             voter: voterPDA,
//             votingAuthority: votingAuthority.publicKey,
//             systemProgram,
//             instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
//         })
//         .instruction();

//     try {
//         // Step 5: **Create and send the transaction**
//         const transaction = new Transaction()
//             .add(computeBudgetIx)
//             .add(ed25519Instruction)
//             .add(registerVoterIx);


//         console.log("VOTING AUTHORITY...",votingAuthority);
//         console.log("VOTING AUTHORITY public key...",votingAuthority.publicKey);
//         console.log("private...", bs58.encode(votingAuthority.secretKey));
//         console.log("private...", admin.publicKey);
//         console.log("voter...", voter1.publicKey);
//         console.log("system program...", systemProgram);
//         console.log("ed25519Instruction...", ed25519Instruction);

//         console.log("✅ Sending transaction...");
//         console.log("Transaction Signatures:", transaction.signatures);

//         const txSignature = await provider.sendAndConfirm(transaction, [votingAuthority], { commitment: "confirmed" });
//         //const txSignature = await provider.sendAndConfirm(transaction, [votingAuthority, voter1], { commitment: "confirmed" });

//         //const txSignature = await provider.sendAndConfirm(transaction, [votingAuthority as anchor.web3.Signer], { commitment: "confirmed" });
        
//         console.log("✅ Transaction Successful! Signature:", txSignature);
//         expect(txSignature).to.be.a("string");
//     } catch (err) {
//         console.error("❌ Register Voter Transaction Failed:", err);
//         throw err;
//     }
});


// it("VA should be able to register a voter with a valid signature", async () => {
//   const provider = anchor.getProvider();
//   //const program = anchor.workspace.MyElectionProgram;
//   //const systemProgram = anchor.web3.SystemProgram.programId;

//   // Generate VA and voter keypairs
//   const votingAuthority = anchor.web3.Keypair.generate();
//   const voter1 = anchor.web3.Keypair.generate();
  
//   // Generate PDAs
//   const [electionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
//       [Buffer.from("election"), votingAuthority.publicKey.toBuffer()],
//       program.programId
//   );

//   const [voter1PDA] = anchor.web3.PublicKey.findProgramAddressSync(
//       [Buffer.from("voter"), electionPDA.toBuffer(), voter1.publicKey.toBuffer()],
//       program.programId
//   );

//   // Message that VA signs (can be voter's public key or other data)
//   const testMessage = Buffer.from(voter1.publicKey.toBuffer());
  
//   // Create Ed25519 signature instruction
//   const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
//       privateKey: votingAuthority.secretKey,
//       message: testMessage,
//   });

//   // Increase compute budget for verification
//   const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
//       units: 500_000,
//   });

//   console.log("reach ehre1  ✅ ")


//   // Create registerVoter instruction
//   const registerVoterIx = await program.methods
//       .registerVoter(voter1.publicKey, new anchor.BN(100)) // Example stake amount
//       .accounts({
//           election: electionPDA,
//           voter: voter1PDA,
//           user: votingAuthority.publicKey,
//           systemProgram,
//           instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
//       })
//       .instruction();
  
//   try {
//       // Create and send the transaction
//       const transaction = new Transaction()
//           .add(computeBudgetIx)
//           .add(ed25519Instruction)
//           .add(registerVoterIx);

//       console.log("reach ehre ✅ ")
//       const txSignature = await provider.sendAndConfirm(transaction, [votingAuthority], { commitment: "confirmed" });
      
//       console.log("Transaction Signature:", txSignature);
//       expect(txSignature).to.be.a("string");
//   } catch (err) {
//       console.error("Register Voter Transaction Failed:", err);
//       throw err;
//   }
// });
})

  // it("Ed25519 instruction works standalone", async () => {
  //   const messageBuffer = Buffer.from("test message");
  //   console.log("Standalone Message Buffer (hex):", messageBuffer.toString("hex"));
  
  //   const { signature } = signMessage(votingAuthority, messageBuffer);
  //   console.log("Standalone Signature (hex):", Buffer.from(signature).toString("hex"));
  //   console.log("Signing VA Public Key:", votingAuthority.publicKey.toBase58());
  
  //   const instructionData = Buffer.concat([
  //     Buffer.from(signature),
  //     votingAuthority.publicKey.toBuffer(),
  //     messageBuffer,
  //   ]);
  //   const ed25519Instruction = new anchor.web3.TransactionInstruction({
  //     keys: [], // Try without accounts first
  //     programId: anchor.web3.Ed25519Program.programId,
  //     data: instructionData,
  //   });
  
  //   console.log("Standalone Ed25519 Instruction Data (hex):", instructionData.toString("hex"));
  //   console.log("Standalone Instruction Length:", instructionData.length);
  
  //   const transaction = new anchor.web3.VersionedTransaction(
  //     new anchor.web3.TransactionMessage({
  //       payerKey: votingAuthority.publicKey,
  //       recentBlockhash: (await provider.connection.getLatestBlockhash("confirmed")).blockhash,
  //       instructions: [ed25519Instruction],
  //     }).compileToV0Message()
  //   );
  //   transaction.sign([votingAuthority]);
  
  //   try {
  //     const simulationResult = await provider.connection.simulateTransaction(transaction, {
  //       commitment: "confirmed",
  //     });
  //     console.log("Standalone Simulation Result:", simulationResult);
  //     if (simulationResult.value.err) {
  //       console.error("Standalone Simulation Failed:", simulationResult.value.err);
  //       console.error("Standalone Simulation Logs:", simulationResult.value.logs);
  //       throw new Error("Standalone simulation failed");
  //     }
  
  //     const txSignature = await provider.connection.sendTransaction(transaction, {
  //       skipPreflight: false,
  //     });
  //     console.log("Standalone Transaction Signature:", txSignature);
  
  //     // Updated confirmTransaction API
  //     //await provider.connection.confirmTransaction({ signature: txSignature, commitment: "confirmed" });
  //     const txDetails = await provider.connection.getParsedTransaction(txSignature, { commitment: "confirmed" });
  //     console.log("Standalone Transaction Logs:", txDetails?.meta?.logMessages);
  //   } catch (err) {
  //     console.error("Standalone Transaction Error:", err);
  //     if (err instanceof anchor.web3.SendTransactionError) {
  //       console.error("Standalone Simulation Logs:", err.logs);
  //     }
  //     throw err;
  //   }
  // });

  // it("VA can register voter with valid Ed25519 signature", async () => {
  //   const messageBuffer = Buffer.concat([
  //     voter1.publicKey.toBuffer(),
  //     stake.toArrayLike(Buffer, "le", 8),
  //     Buffer.from(electionId),
  //   ]);
  
  //   console.log("Test Message Buffer (hex):", messageBuffer.toString("hex"));
  //   console.log("Test VA Public Key:", votingAuthority.publicKey.toBase58());
  
  //   const { signature } = signMessage(votingAuthority, messageBuffer);
  //   console.log("Test Signature (hex):", Buffer.from(signature).toString("hex"));
  
  //   // Manually construct Ed25519 instruction
  //   const instructionData = Buffer.concat([
  //     Buffer.from(signature),
  //     votingAuthority.publicKey.toBuffer(),
  //     messageBuffer,
  //   ]);
  //   const ed25519Instruction = new anchor.web3.TransactionInstruction({
  //     keys: [{ pubkey: votingAuthority.publicKey, isSigner: false, isWritable: false }],
  //     programId: anchor.web3.Ed25519Program.programId,
  //     data: instructionData,
  //   });
  
  //   console.log("Ed25519 Instruction Data (hex):", instructionData.toString("hex"));
  //   console.log("Instruction Length:", instructionData.length);
  
  //   // Build VersionedTransaction
  //   const recentBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  //   const messageV0 = new anchor.web3.TransactionMessage({
  //     payerKey: votingAuthority.publicKey,
  //     recentBlockhash: recentBlockhash.blockhash,
  //     instructions: [
  //       ed25519Instruction,
  //       await program.methods
  //         .registerVoter(voter1.publicKey, stake)
  //         .accounts({
  //           election: electionPDA,
  //           voter: voter1PDA,
  //           user: votingAuthority.publicKey,
  //           systemProgram,
  //           instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //         })
  //         .instruction(),
  //     ],
  //   }).compileToV0Message();
  
  //   const transaction = new anchor.web3.VersionedTransaction(messageV0);
  //   transaction.sign([votingAuthority]);
  
  //   try {
  //     // Simulate transaction
  //     const simulationResult = await provider.connection.simulateTransaction(transaction, {
  //       commitment: "confirmed",
  //     });
  //     console.log("Simulation Result:", simulationResult);
  //     if (simulationResult.value.err) {
  //       console.error("Simulation Failed:", simulationResult.value.err);
  //       console.error("Simulation Logs:", simulationResult.value.logs);
  //       throw new Error("Transaction simulation failed");
  //     }
  
  //     // Send transaction
  //     const txSignature = await provider.connection.sendTransaction(transaction, {
  //       skipPreflight: true,
  //     });
  //     console.log("Transaction Signature:", txSignature);
  
  //     // Confirm transaction
  //     await provider.connection.confirmTransaction(txSignature, "confirmed");
  
  //     // Use getParsedTransaction for VersionedTransaction
  //     const txDetails = await provider.connection.getParsedTransaction(txSignature, { commitment: "confirmed" });
  //     console.log("Transaction Logs:", txDetails?.meta?.logMessages);
  //   } catch (err) {
  //     console.error("Transaction Error:", err);
  //     if (err instanceof anchor.web3.SendTransactionError) {
  //       console.error("Simulation Logs:", err.logs);
  //     }
  //     throw err;
  //   }
  
  //   const voterAccount = await program.account.voter.fetch(voter1PDA);
  //   expect(voterAccount.voterAddress.toBase58()).to.equal(voter1.publicKey.toBase58());
  //   expect(voterAccount.voterStake.toNumber()).to.equal(stake.toNumber());
  //   expect(voterAccount.hasCommitted).to.be.false;
  //   expect(voterAccount.hasRevealed).to.be.false;
  //   expect(voterAccount.commitment).to.be.empty;
  //   expect(voterAccount.encryptedVote).to.be.null;
  // });




  

// it("VA can register voter with valid Ed25519 signature", async () => {
//   const messageBuffer = Buffer.concat([
//     voter.publicKey.toBuffer(),
//     stake.toArrayLike(Buffer, "le", 8),
//     Buffer.from(electionId),
//   ]);

//   console.log("Message Buffer (before signing):", messageBuffer.toString("hex"));

//   const { signature, messageUint8 } = signMessage(votingAuthority, messageBuffer);

//   console.log("Generated Signature:", Buffer.from(signature).toString("hex"));

//   const instructionData = Buffer.concat([
//     Buffer.from(signature),                      // 64-byte signature
//     votingAuthority.publicKey.toBuffer(),        // 32-byte public key
//     messageBuffer                                 // Original message
//   ]);

//   const ed25519Instruction = new TransactionInstruction({
//     keys: [],
//     programId: Ed25519Program.programId,
//     data: instructionData
//   });


//   //console.log("Ed25519 Instruction Signature:", ed25519Signature.toString("hex"));
//   //console.log("Ed25519 Instruction Public Key:", ed25519PublicKey.toBase58());
//   //console.log("Signing message (hex):", messageBuffer.toString("hex"));
//   //console.log("Signature (hex):", Buffer.from(signature).toString("hex"));
//   //console.log("Ed25519 Instruction Data (hex):", ed25519Instruction.data.toString("hex"));

//   //console.log("Using SYSVAR_INSTRUCTIONS_PUBKEY:", anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY.toBase58());

//   const voterAccount = await provider.connection.getAccountInfo(voterPDA);
//   if (voterAccount) {
//     console.log("Voter PDA already exists! Test should not try to re-register.");
//   }

//   // const priorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
//   //   units: 400000, // Increase compute unit limit (default is 200,000)
//   // });

//   const vaBalance = await provider.connection.getBalance(votingAuthority.publicKey);
//   console.log("VA Balance:", vaBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

//   const [expectedVoterPDA] = anchor.web3.PublicKey.findProgramAddressSync(
//     [Buffer.from("voter"), voter.publicKey.toBuffer()],
//     program.programId
//   );
//   console.log("Expected Voter PDA (Test Code):", expectedVoterPDA.toBase58());
//   console.log("Voter Public Key:", voter.publicKey.toBase58());
//   console.log("Ed25519 Instruction:", ed25519Instruction);


//   try {
//     await program.methods
//       .registerVoter(voter.publicKey, stake)
//       .accounts({
//         election: electionPDA,
//         voter: voterPDA,
//         user: votingAuthority.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//         instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
//       })
//       //.preInstructions([priorityIx])
//       // with post it gets instruction 
//       .preInstructions([ed25519Instruction])
//       .signers([votingAuthority])
//       .rpc({ commitment: "confirmed" })
//       .then(() => {
//         console.log("Successfully registered voter!");
//       })
//       .catch((err) => {
//         console.error("Registration Error:", err);
//       });
//   } catch (outerErr) {
//     console.error("Outer Error:", outerErr);
//   }

//   console.log("GOOOD");

//   // Check if the PDA exists at all

//   const voterAccountInfo = await provider.connection.getAccountInfo(voterPDA);


//   if (!voterAccountInfo) {
//     console.error("Voter PDA does NOT exist on-chain! Maybe it was never created?");
//   } else {
//     console.log("Voter PDA exists on-chain! Checking data...");
//   }

//   // Check if the account can be fetched
//   try {
//     let voterAccount = await program.account.voter.fetch(voterPDA);
//     console.log("Voter PDA Created & has data:", voterAccount);
//   } catch (error) {
//     console.error("Voter PDA exists but cannot be fetched!", error);
//   }

// });






// it("APPROACH 2 VA can register voter with valid Ed25519 signature", async () => {
//   const messageBuffer = Buffer.concat([
//     voter1.publicKey.toBuffer(),
//     stake.toArrayLike(Buffer, "le", 8),
//     Buffer.from(electionId),
//   ]);

//   console.log("Test Message Buffer (hex):", messageBuffer.toString("hex"));
//   console.log("Test VA Public Key:", votingAuthority.publicKey.toBase58());

//   const { signature } = signMessage(votingAuthority, messageBuffer);
//   console.log("Test Signature (hex):", Buffer.from(signature).toString("hex"));

//   // Manually construct Ed25519 instruction
//   const instructionData = Buffer.concat([
//     Buffer.from(signature),
//     votingAuthority.publicKey.toBuffer(),
//     messageBuffer,
//   ]);
//   const ed25519Instruction = new anchor.web3.TransactionInstruction({
//     keys: [],
//     programId: anchor.web3.Ed25519Program.programId,
//     data: instructionData,
//   });

//   console.log("Ed25519 Instruction Data (hex):", instructionData.toString("hex"));
//   console.log("Instruction Length:", instructionData.length);

//   // Build transaction manually
//   const transaction = new anchor.web3.Transaction();
//   //transaction.add(ed25519Instruction);
//   transaction.add(
//     await program.methods
//       .registerVoter(voter1.publicKey, stake)
//       .accounts({
//         election: electionPDA,
//         voter: voter1PDA,
//         user: votingAuthority.publicKey,
//         systemProgram,
//         instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
//       })
//       .instruction()
//   );
//   transaction.add(ed25519Instruction);

//   try {
//     const recentBlockhash = await provider.connection.getLatestBlockhash("confirmed");
//     transaction.recentBlockhash = recentBlockhash.blockhash;
//     transaction.feePayer = votingAuthority.publicKey;

//     const txSignature = await anchor.web3.sendAndConfirmTransaction(
//       provider.connection,
//       transaction,
//       [votingAuthority],
//       { commitment: "confirmed", skipPreflight: false }
//     );
//     console.log("Transaction Signature:", txSignature);

//     const txDetails = await provider.connection.getTransaction(txSignature, { commitment: "confirmed" });
//     console.log("Transaction Logs:", txDetails?.meta?.logMessages);
//   } catch (err) {
//     console.error("Transaction Error:", err);
//     if (err instanceof anchor.web3.SendTransactionError) {
//       console.error("Simulation Logs:", err.logs);
//     }
//     throw err;
//   }

//   const voterAccount = await program.account.voter.fetch(voter1PDA);
//   expect(voterAccount.voterAddress.toBase58()).to.equal(voter1.publicKey.toBase58());
//   expect(voterAccount.voterStake.toNumber()).to.equal(stake.toNumber());
//   expect(voterAccount.hasCommitted).to.be.false;
//   expect(voterAccount.hasRevealed).to.be.false;
//   expect(voterAccount.commitment).to.be.empty;
//   expect(voterAccount.encryptedVote).to.be.null;})

// })


  // it("Fails to register voter with invalid Ed25519 signature (wrong signer)", async () => {
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
  //         user: votingAuthority.publicKey,
  //         systemProgram,
  //         instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //       })
  //       .preInstructions([ed25519Instruction])
  //       .signers([votingAuthority])
  //       .rpc({ commitment: "confirmed" });
  //     expect.fail("Should have failed with invalid signer");
  //   } catch (err) {
  //     expect(err.message).to.include("Public key mismatch");
  //   }
  // });

  // it("Fails to register voter with invalid Ed25519 signature (wrong message)", async () => {
  //   const wrongMessage = Buffer.concat([
  //     voter2.publicKey.toBuffer(),
  //     new anchor.BN(999).toArrayLike(Buffer, "le", 8),
  //     Buffer.from("wrong_id"),
  //   ]);

  //   const { signature } = signMessage(votingAuthority, wrongMessage);
  //   const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
  //     publicKey: votingAuthority.publicKey.toBuffer(),
  //     message: wrongMessage,
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
  //     expect.fail("Should have failed with invalid message");
  //   } catch (err) {
  //     expect(err.message).to.include("Message mismatch");
  //   }
  // });

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