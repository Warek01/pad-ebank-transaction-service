OUTPUT=.\\src\\generated\\proto
INPUT=.\\src\\proto

rm -rf $OUTPUT
mkdir -p $OUTPUT

TS_ARGS=(
  lowerCaseServiceMethods=true
  outputEncodeMethods=false
  outputJsonMethods=false
  outputClientImpl=true
  snakeToCamel=true
  nestJs=true
  useNullAsOptional=true
  addNestjsRestParameter=false
  addGrpcMetadata=true
  useOptionals=messages
  unrecognizedEnum=false
  removeEnumPrefix=true
  typePrefix=Proto
  comments=true
  useMapType=true
)

.\\node_modules\\.bin\\protoc \
    --plugin=.\\node_modules\\.bin\\protoc-gen-ts_proto.bat \
    --ts_proto_opt="$(IFS=, ; echo "${TS_ARGS[*]}")" \
    --js_out=$OUTPUT \
    --ts_proto_out=$OUTPUT \
    --proto_path=$INPUT \
    $INPUT\\*.proto

find "$OUTPUT" -name "*.js" -exec rm -f {} \;
echo Protoc files generated
