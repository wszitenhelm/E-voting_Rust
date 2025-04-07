import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingSystem } from "../target/types/voting_system";
import { expect } from "chai";
import fs from "fs";
import nacl from "tweetnacl";
import { Ed25519Program, TransactionInstruction } from "@solana/web3.js";

function signMessage(signer, messageBuffer) {
  console.log("VA public key:", signer.publicKey.toBase58());

  const messageUint8 = new Uint8Array(messageBuffer);
  const signature = nacl.sign.detached(messageUint8, signer.secretKey);

  console.log("VA Secret Key Length:", signer.secretKey.length);
  console.log("VA Secret Key (Hex):", Buffer.from(signer.secretKey).toString("hex"));

  console.log("Signed message:", Buffer.from(messageUint8).toString("hex"));
  console.log("Signature:", Buffer.from(signature).toString("hex"));

  //return { signature: Buffer.alloc(64).fill(1), messageUint8 };
  return { signature, messageUint8 };
}

describe("voting_system", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingSystem as Program<VotingSystem>;
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
      console.log("Admin Public Key:", admin.publicKey.toBase58());
      console.log("Voting Authority:", votingAuthority.publicKey.toBase58());
      console.log("Voter", voter.publicKey.toBase58());

      const adminBalance = await provider.connection.getBalance(admin.publicKey);
      console.log(`Admin SOL balance: ${adminBalance} SOL`);

      // Initialize election
      await program.methods
        .initialize("Test Election", votingAuthority.publicKey, "12345")
        .accounts({
          election: electionPDA,
          //registeredVoters: registeredVotersPDA,
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

    console.log("VA election:", election.votingAuthority);
    console.log("Voting Authority:", votingAuthority.publicKey.toBase58());

    // Check if the voting authority in the contract is correct
    expect(election.votingAuthority.toBase58()).to.equal(votingAuthority.publicKey.toBase58());
  });

  it("Admin can start election", async () => {
    await program.methods
      .startElection()
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
        .startElection()
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
      expect(err.message).to.include("not authorized");
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

    console.log("Message Buffer (before signing):", messageBuffer.toString("hex"));

    const { signature, messageUint8 } = signMessage(votingAuthority, messageBuffer);

    console.log("Generated Signature:", Buffer.from(signature).toString("hex"));

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


    //console.log("Ed25519 Instruction Signature:", ed25519Signature.toString("hex"));
    //console.log("Ed25519 Instruction Public Key:", ed25519PublicKey.toBase58());
    //console.log("Signing message (hex):", messageBuffer.toString("hex"));
    //console.log("Signature (hex):", Buffer.from(signature).toString("hex"));
    //console.log("Ed25519 Instruction Data (hex):", ed25519Instruction.data.toString("hex"));

    //console.log("Using SYSVAR_INSTRUCTIONS_PUBKEY:", anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY.toBase58());

    const voterAccount = await provider.connection.getAccountInfo(voterPDA);
    if (voterAccount) {
      console.log("Voter PDA already exists! Test should not try to re-register.");
    }

    // const priorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    //   units: 400000, // Increase compute unit limit (default is 200,000)
    // });

    const vaBalance = await provider.connection.getBalance(votingAuthority.publicKey);
    console.log("VA Balance:", vaBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

    const [expectedVoterPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), voter.publicKey.toBuffer()],
      program.programId
    );
    console.log("Expected Voter PDA (Test Code):", expectedVoterPDA.toBase58());
    console.log("Voter Public Key:", voter.publicKey.toBase58());
    console.log("Ed25519 Instruction:", ed25519Instruction);


    try {
      await program.methods
        .registerVoter(voter.publicKey, stake)
        .accounts({
          election: electionPDA,
          voter: voterPDA,
          user: votingAuthority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        //.preInstructions([priorityIx])
        // with post it gets instruction 
        .preInstructions([ed25519Instruction])
        .signers([votingAuthority])
        .rpc({ commitment: "confirmed" })
        .then(() => {
          console.log("Successfully registered voter!");
        })
        .catch((err) => {
          console.error("Registration Error:", err);
        });
    } catch (outerErr) {
      console.error("Outer Error:", outerErr);
    }

    console.log("GOOOD");

    // Check if the PDA exists at all

    const voterAccountInfo = await provider.connection.getAccountInfo(voterPDA);


    if (!voterAccountInfo) {
      console.error("Voter PDA does NOT exist on-chain! Maybe it was never created?");
    } else {
      console.log("Voter PDA exists on-chain! Checking data...");
    }

    // Check if the account can be fetched
    try {
      let voterAccount = await program.account.voter.fetch(voterPDA);
      console.log("Voter PDA Created & has data:", voterAccount);
    } catch (error) {
      console.error("Voter PDA exists but cannot be fetched!", error);
    }

  });


  it("Non-VA cannot register voter", async () => {
    try {
      await program.methods
        .registerVoter(voter.publicKey, new anchor.BN(10))
        .accounts({
          election: electionPDA,
          voter2: voterPDA2,
          user: admin.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          instructionsSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .signers([admin])
        .rpc();

      throw new Error("Non-VA was able to register a voter!");
    } catch (err) {
      console.error(err.message);  // Print the error message for debugging
      expect(err.message).to.include("not authorized");
      // Check that the voter PDA was NOT created
      try {
        let voterAccount = await program.account.voter.fetch(voterPDA2);
        throw new Error("Voter PDA was incorrectly created by a non-VA!");
      } catch (fetchErr) {
        expect(fetchErr.message).to.include("Account does not exist");
      }
    }
  });

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


  it("Registered voter can commit a vote with a valid signature and VA certificate", async () => {
    // hashed vote is   hash(encrypt(vote + salt) and nonce)
    const voteHash = Buffer.from("hashed_vote_123"); // Simulated hashed vote
  
    // Voter signs the voteHash
    const { signature: voterSignature, messageUint8: voterMessage } = signMessage(voter, voteHash);
  
    // VA signs the certificate (voter address + stake + electionId)
    const certificateMessage = Buffer.concat([
      voter.publicKey.toBuffer(),
      stake.toArrayLike(Buffer, "le", 8),
      Buffer.from(electionId),
    ]);
    const { signature: vaSignature, messageUint8: vaMessage } = signMessage(votingAuthority, certificateMessage);
  
    // Create Ed25519 instruction to verify the voter's signature on the voteHash
    const verifyVoterInstruction = Ed25519Program.createInstructionWithPublicKey({
      publicKey: voter.publicKey.toBuffer(),
      message: voterMessage,
      signature: voterSignature,
    });  

  
    // Create Ed25519 instruction to verify the VA's certificate signature
    const verifyVAInstruction = Ed25519Program.createInstructionWithPublicKey({
      publicKey: votingAuthority.publicKey.toBuffer(),
      message: vaMessage,
      signature: vaSignature,
    });
  
    // Send transaction with commitVote instruction + both verification instructions
    await program.methods
      .commitVote(voteHash)
      .accounts({
        election: electionPDA,
        voter: voterPDA,
        user: voter.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .preInstructions([verifyVoterInstruction, verifyVAInstruction]) // Include both signature verifications
      .signers([voter])
      .rpc();
  
    // Fetch updated voter account to verify the vote was committed
    const voterAccount = await program.account.voter.fetch(voterPDA);
    expect(Buffer.from(voterAccount.voteHash)).to.eql(voteHash);
  });  
  

  it("Voter can reveal their vote", async () => {
    // Generate a fake vote and nonce
    const fakeVote = Buffer.from("yes"); // Example vote
    const nonce = anchor.utils.bytes.utf8.encode("random_nonce");
  
    // Encrypt vote (Mock, since actual encryption happens off-chain)
    const encryptedVote = Buffer.from([...fakeVote, ...nonce]); // Simulated encryption
    
    // Compute hash as done in commitVote
    const committedHash = web3.utils.sha256(encryptedVote);
  
    // Simulate committing the vote
    await program.methods.commitVote(committedHash)
      .accounts({
        voterPda: voterPDA,
        election: electionPDA,
        user: voter.publicKey,
      })
      .signers([voter])
      .rpc();
  
    // Now, end the election so revealing is allowed
    await program.methods.endVoting()
      .accounts({
        election: electionPDA,
        user: admin.publicKey,
      })
      .signers([admin])
      .rpc();
  
    // Reveal the vote
    await program.methods.revealVote([...encryptedVote], [...nonce])
      .accounts({
        voterPda: voterPDA,
        election: electionPDA,
        user: voter.publicKey,
      })
      .signers([voter])
      .rpc();
  
    // Check that the vote has been marked as revealed
    const voterAccount = await program.account.voter.fetch(voterPDA);
    expect(voterAccount.hasRevealed).to.be.true;
  });
  


});
