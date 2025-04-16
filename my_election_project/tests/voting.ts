import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingSystem } from "../target/types/voting_system";
import { expect } from "chai";
import fs from "fs";
import { Transaction, Ed25519Program, Keypair, PublicKey } from "@solana/web3.js";


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


it("test of all", async () => {
  const provider = anchor.getProvider();
  const bs58 = require("bs58"); // Ensure you have the bs58 package installed
  const voter1 = anchor.web3.Keypair.generate();
  const voterPublicKey = bs58.encode(voter1.publicKey.toBytes()); // Encode public key as base58
  const stake = "34"; // Use the exact stake value
  const electionId = "12345"; // Election ID // assume election ID is 5 digit string
  const testMessage = Buffer.from(`${voterPublicKey}-${stake}-${electionId}`, "utf-8");

  try {
    const election = await program.account.election.fetch(electionPDA);
  } catch (error) {
    console.log("INITIALIZE ELECTION")
    const tx = await program.methods
      .initialize("Test Election", votingAuthority.publicKey, electionId, new anchor.BN(1), new anchor.BN(30))
      .accountsStrict({
        election: electionPDA,
        user: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    const electionAfter = await program.account.election.fetch(electionPDA);
  }


  const ed25519Instruction = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: votingAuthority.secretKey,
      message: testMessage,
  });

  const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
  });
  
  const [voterPDA, voterBump] = await anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("voter"), voter1.publicKey.toBuffer()],
    program.programId
  );

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
      const voterAccount = await provider.connection.getAccountInfo(voterPDA);
      if (voterAccount) {
            console.log("sucess.");
          //console.log("Voter account:", voterAccount);
      } else {
          console.log("Voter PDA does not exist yet.");
      }
      expect(txSignature).to.be.a("string");
  } catch (err) {
      console.error("❌ Register Voter Transaction Failed:", err);
      throw err;
  }

  // START THE VOTING 

      await program.methods
      .startElection()
      .accounts({
        election: electionPDA,
        user: admin.publicKey
      })
      .signers([admin])
      .rpc({ commitment: "confirmed" });

    
    // COMMIT VOTE


    const encryptedVote = Buffer.from("encryptedvote1", "utf-8"); // 👈 replace with your data
    const nonce = Buffer.from("random-nonce-here", "utf-8");

    // Sanity check: this should match what was used to create the commitment
    const commitmentHex = require("crypto")
    .createHash("sha256")
    .update(Buffer.concat([encryptedVote, nonce]))
    .digest("hex");

    //const commitmentHex = "a3b1c5d7e9f0112233445566778899aabbccddeeff"; // Example hex
    const commitment = Uint8Array.from(Buffer.from(commitmentHex, "hex"));
    const commitmentFunction = Buffer.from(commitmentHex, "hex"); // ✅ Convert directly to Buffer

    const doubledStake = parseInt(stake) * 2;
    const testMessageCert = Buffer.from(`${voterPublicKey}-${doubledStake}-${electionId}`, "utf-8");
    
    // passed off-chain from VA to voter 
    const ed25519InstructionCert = Ed25519Program.createInstructionWithPrivateKey({
        privateKey: votingAuthority.secretKey,
        message: testMessageCert,
    });
  

    const certificate = Buffer.from(ed25519InstructionCert.data); // ✅ Buffer

    const ed25519InstructionVoter = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: voter1.secretKey,
      message: commitment,
  });

  // NEED TO CHANGE CERTIFICATE DATA TO BE DIFFERENT FROM SIGNATURE :))) AND CODE AS WELL!!


    const commitVoteIx = await program.methods
    .commitVote(commitmentFunction, certificate) //
    .accountsStrict({
      voterPda: voterPDA,
      election: electionPDA,
      user: voter1.publicKey,
      instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .instruction();

    try {
    const transaction = new Transaction()
        .add(computeBudgetIx)
        .add(ed25519InstructionVoter)
        .add(commitVoteIx);

    const txSignature = await provider.sendAndConfirm(transaction, [voter1], { commitment: "confirmed" });

    const txInfo = await provider.connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0, // Ensures compatibility with older versions
    });
    console.log("Transaction Logs:", txInfo?.meta?.logMessages);
    const voterAccount = await provider.connection.getAccountInfo(voterPDA);
    if (voterAccount) {
      console.log("COMMIT SUCCESS");

    } else {
        console.log("Voter PDA does not exist yet.");
    }
    expect(txSignature).to.be.a("string");
    } catch (err) {
    console.error("COMMMIT FAILED", err);
    throw err;
    }



  // END VOTING 


    //     // 🛑 Step 2: End the election (simulate time passing)
        const endElectionIx = await program.methods
        .endVoting()
        .accountsStrict({
          election: electionPDA,
          user: admin.publicKey,
        })
        .instruction();
    
        const endTx = new Transaction().add(endElectionIx);
        await provider.sendAndConfirm(endTx, [admin], { commitment: "confirmed" });


    // //// CHECKING REVEAL ELEMENT 

      const revealHash = require("crypto")
      .createHash("sha256")
      .update(Buffer.concat([encryptedVote, nonce]))
      .digest("hex");

      const revealIx = await program.methods
      .revealVote(encryptedVote, nonce)
      .accountsStrict({
        voterPda: voterPDA,
        election: electionPDA,
        user: voter1.publicKey,
      })
      .instruction();


    try {
      const tx = new Transaction().add(revealIx);
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      tx.recentBlockhash = latestBlockhash.blockhash;

      const revealSig = await provider.sendAndConfirm(tx, [voter1], { commitment: "confirmed" });
      console.log("✅ Reveal vote success! Tx:", revealSig);
      

      // Fetch updated voter account to assert it has been revealed
      const voterAccount: any = await program.account.voter.fetch(voterPDA);
      expect(voterAccount.hasRevealed).to.be.true;
    } catch (err) {
      console.error("❌ Reveal vote failed:", err);
      throw err;
    }

});
});